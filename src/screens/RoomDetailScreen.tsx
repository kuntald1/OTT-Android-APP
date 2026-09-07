import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { createRoomPost, fetchRoomDetail, RoomPost } from "@/api/community";
import { COLORS } from "@/theme/colors";

export default function RoomDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const roomId: string = route.params.roomId;
  const roomTitle: string | undefined = route.params.roomTitle;

  const [posts, setPosts] = useState<RoomPost[]>([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: roomTitle || "Room" });
  }, [roomTitle]);

  useEffect(() => {
    (async () => {
      try {
        const detail = await fetchRoomDetail(roomId);
        setPosts(detail.posts);
      } catch {
        setError("Couldn't load this room");
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId]);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const post = await createRoomPost(roomId, newPost.trim());
      setPosts((prev) => [post, ...prev]);
      setNewPost("");
    } catch (e: any) {
      Alert.alert(
        "Couldn't post",
        e?.response?.data?.detail || "Something went wrong sending that message."
      );
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        style={styles.list}
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No posts yet — be the first.</Text>}
        renderItem={({ item }) => (
          <View style={styles.postRow}>
            <Text style={styles.postAuthor}>
              {item.author_name}
              {item.is_admin ? " · Admin" : ""}
            </Text>
            <Text style={styles.postText}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Write a message..."
          placeholderTextColor="#c9b8b8"
          value={newPost}
          onChangeText={setNewPost}
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handlePost}
          disabled={posting || !newPost.trim()}
        >
          {posting ? (
            <ActivityIndicator color={COLORS.ctaText} size="small" />
          ) : (
            <Text style={styles.sendButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: { color: COLORS.burgundyLight },
  list: { flex: 1 },
  listContent: { padding: 16 },
  emptyText: { color: COLORS.cream, opacity: 0.6, textAlign: "center", marginTop: 40 },
  postRow: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  postAuthor: { color: COLORS.gold, fontSize: 13, fontWeight: "600" },
  postText: { color: COLORS.cream, opacity: 0.9, fontSize: 14, marginTop: 4 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
    backgroundColor: COLORS.burgundyDark,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: COLORS.cream,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonText: { color: COLORS.ctaText, fontSize: 13, fontWeight: "700" },
});
