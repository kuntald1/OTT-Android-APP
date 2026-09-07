import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  createRoom,
  fetchBlogs,
  fetchCommunityHero,
  fetchCommunityRooms,
  Blog,
  CommunityRoom,
} from "@/api/community";
import { PageHero } from "@/api/content";
import { resolveMediaUrl } from "@/api/apiClient";
import { COLORS } from "@/theme/colors";
import AppHeader from "@/components/AppHeader";
import GradientBackground from "@/components/GradientBackground";
import CollapsibleSection from "@/components/CollapsibleSection";

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const [hero, setHero] = useState<PageHero | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [rooms, setRooms] = useState<CommunityRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      setBlogs(await fetchBlogs());
    } catch {
      setError("Couldn't load, try again");
    }
    try {
      setHero(await fetchCommunityHero());
    } catch {
      setHero(null);
    }
    try {
      setRooms(await fetchCommunityRooms());
    } catch {
      setRooms([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCreateRoom = async () => {
    if (!newRoomTitle.trim()) return;
    setCreatingRoom(true);
    try {
      const room = await createRoom(newRoomTitle.trim());
      setRooms((prev) => [room, ...prev]);
      setNewRoomTitle("");
      setCreateModalVisible(false);
      navigation.navigate("RoomDetail", { roomId: room.id, roomTitle: room.title });
    } catch (e: any) {
      Alert.alert(
        "Couldn't create room",
        e?.response?.data?.detail || "Something went wrong creating that room."
      );
    } finally {
      setCreatingRoom(false);
    }
  };

  const heroImageUrl = resolveMediaUrl(hero?.media?.[0]?.media_url);
  const filteredBlogs = query.trim()
    ? blogs.filter((b) => b.title.toLowerCase().includes(query.trim().toLowerCase()))
    : blogs;

  return (
    <GradientBackground style={styles.screen}>
      <AppHeader activeRoute="Community" onSearch={setQuery} showSwitcher />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
          }
        >
          <View style={styles.mainContent}>
            {hero && (
              <View style={styles.hero}>
                {heroImageUrl && (
                  <Image source={{ uri: heroImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                )}
                <View style={styles.heroOverlay} />
                <View style={styles.heroText}>
                  {hero.eyebrow && <Text style={styles.heroEyebrow}>{hero.eyebrow.toUpperCase()}</Text>}
                  <Text style={styles.heroHeadline}>{hero.headline}</Text>
                  {hero.subtext && <Text style={styles.heroSubtext}>{hero.subtext}</Text>}
                </View>
              </View>
            )}

            <View style={styles.sectionsCard}>
              <CollapsibleSection
                title="Blog"
                summary={filteredBlogs.length > 0 ? `${filteredBlogs.length} posts · latest: ${filteredBlogs[0].title}` : "No posts yet"}
                divider={false}
              >
                {filteredBlogs.map((item) => (
                  <TouchableOpacity
                    key={item.id}
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
                        <Text style={styles.blogMeta}>
                          👍 {item.likes_count} · 💬 {item.comment_count}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </CollapsibleSection>

              <CollapsibleSection
                title="Community Room"
                summary={rooms.length > 0 ? `${rooms.length} rooms` : "No rooms yet"}
              >
                {rooms.map((room) => (
                  <View key={room.id} style={styles.roomCard}>
                    <View style={styles.roomIcon}>
                      <Text style={styles.roomIconText}>💬</Text>
                    </View>
                    <View style={styles.roomInfo}>
                      <Text style={styles.roomTitle}>{room.title}</Text>
                      <Text style={styles.roomAuthor}>Started by {room.created_by_name}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={() => navigation.navigate("RoomDetail", { roomId: room.id, roomTitle: room.title })}
                    >
                      <Text style={styles.joinButtonText}>Join</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.createRoomButton}
                  onPress={() => setCreateModalVisible(true)}
                >
                  <Text style={styles.createRoomText}>+ Create Room</Text>
                </TouchableOpacity>
              </CollapsibleSection>

              <CollapsibleSection title="Support a Plays Organiser" summary="Donate to independent theatre programs">
                <View style={styles.organiserSection}>
                  <View style={styles.organiserIcon}>
                    <Text style={styles.roomIconText}>🎭</Text>
                  </View>
                  <View style={styles.organiserInfo}>
                    <Text style={styles.organiserSubtext}>
                      Donate directly to organisers running independent theatre programs.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.organiserButton}
                    onPress={() => navigation.navigate("Organisers")}
                  >
                    <Text style={styles.organiserButtonText}>View Organisers</Text>
                  </TouchableOpacity>
                </View>
              </CollapsibleSection>
            </View>
          </View>
        </ScrollView>
      )}

      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Room</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Room title"
              placeholderTextColor="#c9b8b8"
              value={newRoomTitle}
              onChangeText={setNewRoomTitle}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setCreateModalVisible(false);
                  setNewRoomTitle("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCreateButton}
                onPress={handleCreateRoom}
                disabled={creatingRoom || !newRoomTitle.trim()}
              >
                {creatingRoom ? (
                  <ActivityIndicator color={COLORS.ctaText} size="small" />
                ) : (
                  <Text style={styles.modalCreateText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  mainContent: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  errorText: { color: COLORS.burgundyLight },
  hero: {
    height: 160,
    backgroundColor: COLORS.burgundyDark,
    justifyContent: "flex-end",
    padding: 16,
    overflow: "hidden",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(36, 0, 7, 0.55)",
  },
  heroText: {},
  heroEyebrow: { color: COLORS.gold, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  heroHeadline: { color: COLORS.cream, fontSize: 20, fontWeight: "800", marginTop: 4 },
  heroSubtext: { color: COLORS.cream, opacity: 0.85, fontSize: 12, marginTop: 4 },
  sectionsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: COLORS.burgundyMuted,
    overflow: "hidden",
  },
  blogCard: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
    gap: 12,
  },
  blogCover: { width: 90, height: 90, borderRadius: 8, backgroundColor: COLORS.burgundyDark },
  blogContent: { flex: 1 },
  blogTitle: { color: COLORS.cream, fontSize: 15, fontWeight: "700" },
  blogExcerpt: { color: COLORS.cream, opacity: 0.7, fontSize: 13, marginTop: 4 },
  blogMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  blogMeta: { color: COLORS.gold, fontSize: 11 },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    backgroundColor: "rgba(0,0,0,0.15)",
    gap: 12,
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
  createRoomButton: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(212,175,55,0.5)",
    alignItems: "center",
  },
  createRoomText: { color: COLORS.gold, fontSize: 13, fontWeight: "700" },
  organiserSection: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    backgroundColor: "rgba(0,0,0,0.15)",
    gap: 12,
  },
  organiserIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(212,175,55,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  organiserInfo: { flex: 1 },
  organiserSubtext: { color: COLORS.cream, opacity: 0.7, fontSize: 12 },
  organiserButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  organiserButtonText: { color: COLORS.ctaText, fontSize: 12, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.burgundyDark,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: { color: COLORS.cream, fontSize: 17, fontWeight: "700", marginBottom: 14 },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    color: COLORS.cream,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  modalButtonRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
  modalCancelButton: { paddingVertical: 10, paddingHorizontal: 14 },
  modalCancelText: { color: COLORS.cream, opacity: 0.7, fontSize: 14 },
  modalCreateButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  modalCreateText: { color: COLORS.ctaText, fontSize: 14, fontWeight: "700" },
});
