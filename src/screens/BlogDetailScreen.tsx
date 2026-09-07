import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
