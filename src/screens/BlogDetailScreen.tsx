import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Share as RNShare,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ShareLib from "react-native-share";
import * as FileSystem from "expo-file-system/legacy";
import { useRoute } from "@react-navigation/native";
import {
  deleteBlogComment,
  fetchBlogComments,
  fetchBlogDetail,
  postBlogComment,
  toggleBlogLike,
  BlogComment,
  BlogDetail,
} from "@/api/community";
import { resolveMediaUrl } from "@/api/apiClient";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/theme/colors";

// TODO: replace with the real App ID from developers.facebook.com (My Apps
// → your app → Settings → Basic). Required by Meta since Jan 2023 for any
// app sharing to Instagram/Facebook Stories — sharing will fail with a
// placeholder value.
const FACEBOOK_APP_ID = "1930011521292076";

export default function BlogDetailScreen() {
  const route = useRoute<any>();
  const blogId: string = route.params.blogId;
  const { user } = useAuth();
  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [detail, commentList] = await Promise.all([
          fetchBlogDetail(blogId),
          fetchBlogComments(blogId),
        ]);
        setBlog(detail);
        setLiked(detail.liked_by_me);
        setLikesCount(detail.likes_count);
        setComments(commentList);
      } catch {
        setError("Couldn't load this post");
      } finally {
        setLoading(false);
      }
    })();
  }, [blogId]);

  const handleToggleLike = async () => {
    setLiked(!liked);
    setLikesCount((c) => (liked ? c - 1 : c + 1));
    try {
      const res = await toggleBlogLike(blogId);
      setLiked(res.liked);
      setLikesCount(res.likes_count);
    } catch {
      setLiked(liked);
      setLikesCount(likesCount);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const comment = await postBlogComment(blogId, newComment.trim());
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
    } catch {
      // Leave the typed text in place so the person can retry.
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== commentId));
    try {
      await deleteBlogComment(blogId, commentId);
    } catch {
      setComments(prev);
    }
  };

  // Confirmed working web URL pattern for a blog post (movixa.duckdns.org/blog/{id}).
  const shareUrl = `https://movixa.duckdns.org/blog/${blogId}`;
  const shareMessage = blog ? `${blog.title} — ${shareUrl}` : shareUrl;

  // These open the respective app directly with the content pre-filled —
  // they don't touch any "post" endpoint in this app, just hand off to the
  // OS/other app to share externally.
  const shareToWhatsApp = () => {
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareMessage)}`).catch(() => {
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`);
    });
  };

  const shareToFacebook = () => {
    Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
  };

  // Downloads the remote cover image to a local file, then reads it as
  // base64 — required for react-native-share's Stories sharing on Android
  // when enableBase64ShareAndroid is set (a plain file:// path silently
  // fails to launch the Stories composer, per multiple real-world reports
  // for this exact library).
  const getLocalCoverImage = async (): Promise<{ uri: string } | { error: string }> => {
    const remoteUrl = blog?.cover_image_url ? resolveMediaUrl(blog.cover_image_url) : null;
    if (!remoteUrl) return { error: "This post has no cover_image_url set." };
    try {
      const localPath = `${FileSystem.cacheDirectory}blog-cover-${blogId}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(remoteUrl, localPath);
      if (downloadResult.status !== 200) {
        return { error: `Cover image download returned HTTP ${downloadResult.status} for ${remoteUrl}` };
      }
      const base64 = await FileSystem.readAsStringAsync(localPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return { uri: Platform.OS === "android" ? `data:image/jpeg;base64,${base64}` : localPath };
    } catch (err: any) {
      return { error: `${err?.message || err} (url: ${remoteUrl})` };
    }
  };

  const shareToFacebookStory = async () => {
    const cover = await getLocalCoverImage();
    if ("error" in cover) {
      Alert.alert("Couldn't prepare cover image", `${cover.error} — falling back to a normal Facebook post.`);
      shareToFacebook();
      return;
    }
    try {
      const result = await ShareLib.shareSingle({
        appId: FACEBOOK_APP_ID,
        backgroundImage: cover.uri,
        backgroundTopColor: "#5E0018",
        backgroundBottomColor: "#241014",
        social: ShareLib.Social.FACEBOOK_STORIES,
      } as any);
      if (result && (result as any).success === false) {
        Alert.alert("Facebook Story sharing didn't complete", JSON.stringify(result));
      }
    } catch (err: any) {
      Alert.alert("Facebook Story sharing failed", JSON.stringify(err?.message || err));
      shareToFacebook();
    }
  };

  // Instagram has no URL scheme for pre-filled feed/link sharing, but
  // Stories sharing (with a background image) IS an officially supported
  // Meta feature via react-native-share, using the same Facebook App ID.
  const shareToInstagramStory = async () => {
    const cover = await getLocalCoverImage();
    if ("error" in cover) {
      Alert.alert("Couldn't prepare cover image", `${cover.error} — opening Instagram normally instead.`);
      Linking.openURL("instagram://app").catch(() => Linking.openURL("https://www.instagram.com/"));
      return;
    }
    try {
      const result = await ShareLib.shareSingle({
        appId: FACEBOOK_APP_ID,
        backgroundImage: cover.uri,
        backgroundTopColor: "#5E0018",
        backgroundBottomColor: "#241014",
        social: ShareLib.Social.INSTAGRAM_STORIES,
      } as any);
      if (result && (result as any).success === false) {
        Alert.alert("Instagram Story sharing didn't complete", JSON.stringify(result));
      }
    } catch (err: any) {
      Alert.alert("Instagram Story sharing failed", JSON.stringify(err?.message || err));
      Linking.openURL("instagram://app").catch(() => Linking.openURL("https://www.instagram.com/"));
    }
  };

  const shareGeneric = () => {
    RNShare.share({ message: shareMessage, url: shareUrl, title: blog?.title });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  if (error || !blog) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Not found"}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.scroll}>
        {blog.cover_image_url && (
          <Image
            source={{ uri: resolveMediaUrl(blog.cover_image_url) }}
            style={styles.cover}
            resizeMode="cover"
          />
        )}
        <View style={styles.content}>
          <Text style={styles.title}>{blog.title}</Text>
          <Text style={styles.meta}>
            {blog.author_name} · {new Date(blog.published_at).toLocaleDateString()}
          </Text>

          <TouchableOpacity style={styles.likeButton} onPress={handleToggleLike}>
            <Text style={[styles.likeButtonText, liked && styles.likeButtonTextActive]}>
              👍 {likesCount}
            </Text>
          </TouchableOpacity>

          <View style={styles.shareRow}>
            <Text style={styles.shareLabel}>Share:</Text>
            <TouchableOpacity style={[styles.shareButton, styles.shareWhatsApp]} onPress={shareToWhatsApp}>
              <Text style={styles.shareButtonText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareButton, styles.shareFacebook]} onPress={shareToFacebookStory}>
              <Text style={styles.shareButtonText}>Facebook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareButton, styles.shareInstagram]} onPress={shareToInstagramStory}>
              <Text style={styles.shareButtonText}>Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareButton, styles.shareGeneric]} onPress={shareGeneric}>
              <Text style={styles.shareButtonText}>Share...</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.body}>{blog.body}</Text>

          <View style={styles.commentsSection}>
            <Text style={styles.sectionHeading}>Comments ({comments.length})</Text>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentRow}>
                <View style={styles.commentHeaderRow}>
                  <Text style={styles.commentAuthor}>
                    {comment.user_name}
                    {comment.is_admin ? " · Admin" : ""}
                  </Text>
                  {user?.id === comment.user_id && (
                    <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
                      <Text style={styles.commentDelete}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.commentInputRow}>
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment..."
          placeholderTextColor="#c9b8b8"
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity
          style={styles.commentSendButton}
          onPress={handlePostComment}
          disabled={posting || !newComment.trim()}
        >
          {posting ? (
            <ActivityIndicator color={COLORS.ctaText} size="small" />
          ) : (
            <Text style={styles.commentSendText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: { color: COLORS.burgundyLight },
  cover: { width: "100%", aspectRatio: 16 / 9, backgroundColor: COLORS.burgundyDark },
  content: { padding: 16 },
  title: { color: COLORS.cream, fontSize: 22, fontWeight: "700" },
  meta: { color: COLORS.gold, fontSize: 12, marginTop: 6 },
  likeButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
  },
  likeButtonText: { color: COLORS.cream, fontSize: 13 },
  likeButtonTextActive: { color: COLORS.gold, fontWeight: "700" },
  shareRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 14 },
  shareLabel: { color: COLORS.cream, opacity: 0.6, fontSize: 12 },
  shareButton: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  shareButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  shareWhatsApp: { backgroundColor: "#25D366" },
  shareFacebook: { backgroundColor: "#1877F2" },
  shareInstagram: { backgroundColor: "#C13584" },
  shareGeneric: { backgroundColor: "rgba(255,255,255,0.15)" },
  body: { color: COLORS.cream, opacity: 0.9, fontSize: 15, lineHeight: 22, marginTop: 16 },
  commentsSection: { marginTop: 28 },
  sectionHeading: { color: COLORS.cream, fontSize: 15, fontWeight: "700", marginBottom: 12 },
  commentRow: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  commentHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  commentAuthor: { color: COLORS.gold, fontSize: 13, fontWeight: "600" },
  commentDelete: { color: COLORS.burgundyLight, fontSize: 12 },
  commentContent: { color: COLORS.cream, opacity: 0.85, fontSize: 14, marginTop: 4 },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
    backgroundColor: COLORS.burgundyDark,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: COLORS.cream,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  commentSendButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentSendText: { color: COLORS.ctaText, fontSize: 13, fontWeight: "700" },
});
