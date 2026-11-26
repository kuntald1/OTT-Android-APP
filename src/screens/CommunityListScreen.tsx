import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Blog, CommunityRoom, fetchBlogs, fetchCommunityRooms } from "@/api/community";
import { resolveMediaUrl } from "@/api/apiClient";
import { COLORS } from "@/theme/colors";
import GradientBackground from "@/components/GradientBackground";
import SearchField from "@/components/SearchField";

// Everything behind a "View all" on the Community page. The page itself
// now shows only the first few of each kind, so this is where the rest
// lives — one screen for both lists, because the chrome (search box at
// the top, scrolling list under it, empty state) is the same and only
// the row differs.
//
// It fetches its own copy rather than taking the list through route
// params: arriving here usually means the person is looking for
// something specific, and a list that silently went stale while they
// browsed would be the wrong thing to search through.
export default function CommunityListScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const kind: "blogs" | "rooms" = route.params?.kind === "rooms" ? "rooms" : "blogs";

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [rooms, setRooms] = useState<CommunityRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (kind === "rooms") {
          const data = await fetchCommunityRooms();
          if (!cancelled) setRooms(data);
        } else {
          const data = await fetchBlogs();
          if (!cancelled) setBlogs(data);
        }
      } catch {
        if (!cancelled) setError("Couldn't load, pull down or try again");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      // The screen can be popped mid-request; without this the state
      // setter fires on an unmounted component.
      cancelled = true;
    };
  }, [kind]);

  const needle = query.trim().toLowerCase();
  const filteredBlogs = useMemo(
    () =>
      needle
        ? blogs.filter((b) =>
            [b.title, b.excerpt, b.author_name].some((f) => (f || "").toLowerCase().includes(needle))
          )
        : blogs,
    [blogs, needle]
  );
  const filteredRooms = useMemo(
    () =>
      needle
        ? rooms.filter((r) =>
            [r.title, r.created_by_name].some((f) => (f || "").toLowerCase().includes(needle))
          )
        : rooms,
    [rooms, needle]
  );

  const count = kind === "rooms" ? filteredRooms.length : filteredBlogs.length;

  const renderBlog = ({ item }: { item: Blog }) => (
    <TouchableOpacity
      style={styles.blogCard}
      onPress={() => navigation.navigate("BlogDetail", { blogId: item.id })}
    >
      {item.cover_image_url && (
        <Image
          source={{ uri: resolveMediaUrl(item.cover_image_url) }}
          style={styles.blogCover}
          resizeMode="cover"
        />
      )}
      <View style={styles.blogContent}>
        <Text style={styles.blogTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.blogExcerpt} numberOfLines={2}>
          {item.excerpt}
        </Text>
        <View style={styles.blogMetaRow}>
          <Text style={styles.blogMeta}>{item.author_name}</Text>
          <Text style={styles.blogMeta}>💬 {item.comment_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRoom = ({ item }: { item: CommunityRoom }) => (
    <View style={styles.roomCard}>
      <View style={styles.roomIcon}>
        <Text style={styles.roomIconText}>💬</Text>
      </View>
      <View style={styles.roomInfo}>
        <Text style={styles.roomTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.roomAuthor} numberOfLines={1}>
          Started by {item.created_by_name}
          {item.post_count ? ` · ${item.post_count} posts` : ""}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.joinButton}
        onPress={() => navigation.navigate("RoomDetail", { roomId: item.id, roomTitle: item.title })}
      >
        <Text style={styles.joinButtonText}>Join</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <GradientBackground style={styles.screen}>
      <View style={styles.searchWrap}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={kind === "rooms" ? "Search rooms" : "Search posts"}
        />
        {!loading && !error && (
          <Text style={styles.count}>
            {count} {kind === "rooms" ? "room" : "post"}
            {count === 1 ? "" : "s"}
            {needle ? " found" : ""}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : kind === "rooms" ? (
        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => item.id}
          renderItem={renderRoom}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.empty}>
              {needle ? `No room matches "${query.trim()}".` : "No rooms yet."}
            </Text>
          }
        />
      ) : (
        <FlatList
          data={filteredBlogs}
          keyExtractor={(item) => item.id}
          renderItem={renderBlog}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.empty}>
              {needle ? `No post matches "${query.trim()}".` : "No posts yet."}
            </Text>
          }
        />
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  count: { color: COLORS.cream, opacity: 0.55, fontSize: 12, marginTop: 8, marginLeft: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  errorText: { color: COLORS.burgundyLight },
  empty: { color: COLORS.cream, opacity: 0.6, fontSize: 14, textAlign: "center", marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  // Same cards as the Community page, so "View all" feels like the list
  // carrying on rather than a different screen.
  blogCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  blogCover: { width: 90, height: 90, borderRadius: 12, backgroundColor: COLORS.burgundyDark },
  blogContent: { flex: 1 },
  blogTitle: { color: COLORS.cream, fontSize: 15, fontWeight: "700" },
  blogExcerpt: { color: COLORS.cream, opacity: 0.7, fontSize: 13, marginTop: 4 },
  blogMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  blogMeta: { color: COLORS.gold, fontSize: 11 },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  roomIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(212,175,55,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  roomIconText: { fontSize: 16 },
  roomInfo: { flex: 1 },
  roomTitle: { color: COLORS.cream, fontSize: 14, fontWeight: "700" },
  roomAuthor: { color: COLORS.cream, opacity: 0.6, fontSize: 12, marginTop: 2 },
  joinButton: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  joinButtonText: { color: COLORS.gold, fontSize: 12, fontWeight: "700" },
});
