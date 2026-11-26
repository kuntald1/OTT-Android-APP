import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  fetchBlogs,
  fetchCommunityHero,
  fetchCommunityRooms,
  fetchMyBlogs,
  fetchOrganisers,
  Blog,
  CommunityRoom,
  Organiser,
} from "@/api/community";
import { PageHero } from "@/api/content";
import { resolveMediaUrl } from "@/api/apiClient";
import { COLORS } from "@/theme/colors";
import AppHeader from "@/components/AppHeader";
import GradientBackground from "@/components/GradientBackground";
import CollapsibleSection from "@/components/CollapsibleSection";
import SearchField from "@/components/SearchField";

// How many rows a section shows before it stops and offers "View all".
// Opening a section used to pour the entire blog archive onto the page,
// which buried the two sections underneath it.
const PREVIEW_COUNT = 5;

// Case-insensitive "does any of these fields contain it". Empty query
// matches everything, so it can be chained without a special case.
const matches = (fields: (string | null | undefined)[], query: string) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => (f || "").toLowerCase().includes(needle));
};

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const [hero, setHero] = useState<PageHero | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [rooms, setRooms] = useState<CommunityRoom[]>([]);
  const [organisers, setOrganisers] = useState<Organiser[]>([]);
  // This person's own submissions. Shown above the public list, because
  // somebody who has just written a post comes back here to find out
  // what happened to it.
  const [myBlogs, setMyBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The header's magnifier narrows the whole page; each section also has
  // its own box for narrowing just that list. They stack, so a section
  // search never shows something the page search has already ruled out.
  const [query, setQuery] = useState("");
  const [blogQuery, setBlogQuery] = useState("");
  const [roomQuery, setRoomQuery] = useState("");
  const [organiserQuery, setOrganiserQuery] = useState("");

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
    try {
      setMyBlogs(await fetchMyBlogs());
    } catch {
      // Logged out, or the endpoint is unreachable — the public list
      // below still works, so there is nothing to tell anyone.
      setMyBlogs([]);
    }
    try {
      setOrganisers(await fetchOrganisers());
    } catch {
      // The section still works without the preview — its "View all"
      // opens the Organisers screen, which fetches for itself.
      setOrganisers([]);
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

  const heroImageUrl = resolveMediaUrl(hero?.media?.[0]?.media_url);

  // Page search first, then the section's own box. Searching the excerpt
  // and the author as well as the title, because "that piece by Sujoy" is
  // how people actually look for a post.
  const filteredBlogs = useMemo(
    () =>
      blogs.filter(
        (b) =>
          matches([b.title, b.excerpt, b.author_name], query) &&
          matches([b.title, b.excerpt, b.author_name], blogQuery)
      ),
    [blogs, query, blogQuery]
  );
  const filteredRooms = useMemo(
    () =>
      rooms.filter(
        (r) =>
          matches([r.title, r.created_by_name], query) &&
          matches([r.title, r.created_by_name], roomQuery)
      ),
    [rooms, query, roomQuery]
  );
  const filteredOrganisers = useMemo(
    () => organisers.filter((o) => matches([o.name], query) && matches([o.name], organiserQuery)),
    [organisers, query, organiserQuery]
  );

  // One row under each short list, shown only when there is more to see.
  const viewAllRow = (total: number, label: string, onPress: () => void) =>
    total > PREVIEW_COUNT ? (
      <TouchableOpacity style={styles.viewAllRow} onPress={onPress}>
        <Text style={styles.viewAllText}>View all {total} {label}</Text>
        <Text style={styles.viewAllChevron}>›</Text>
      </TouchableOpacity>
    ) : null;

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
              {/* Open by default: with the list capped at five the page
                  no longer drowns, and three shut bars gave no sense of
                  what the Community page actually holds. */}
              <CollapsibleSection
                title="Blog"
                summary={filteredBlogs.length > 0 ? `${filteredBlogs.length} posts · latest: ${filteredBlogs[0].title}` : "No posts yet"}
                premium
                defaultExpanded
                icon="📝"
              >
                {/* Anyone with an account can write; the editors decide
                    what goes up. CreateBlogScreen says so before and
                    after writing. */}
                <TouchableOpacity
                  style={styles.createBlogButton}
                  onPress={() => navigation.navigate("CreateBlog")}
                >
                  <Text style={styles.createBlogText}>✎  Create Blog</Text>
                </TouchableOpacity>

                {/* Only posts still waiting or turned down — an approved
                    one is already in the list underneath. */}
                {myBlogs.filter((b) => b.status && b.status !== "published").map((b) => (
                  <View key={b.id} style={styles.myPostCard}>
                    <Text
                      style={[
                        styles.myPostBadge,
                        b.status === "rejected" ? styles.myPostBadgeBad : styles.myPostBadgeWaiting,
                      ]}
                    >
                      {b.status === "rejected" ? "NOT PUBLISHED" : "AWAITING REVIEW"}
                    </Text>
                    <Text style={styles.myPostTitle}>{b.title}</Text>
                    {b.status === "rejected" && !!b.review_note && (
                      <Text style={styles.myPostNote}>What needs changing: {b.review_note}</Text>
                    )}
                    {/* Editable right up until an editor publishes it.
                        On a rejected post this is the whole point of the
                        reason above — saving sends it back for review. */}
                    <TouchableOpacity
                      style={styles.myPostEdit}
                      onPress={() => navigation.navigate("CreateBlog", { post: b })}
                    >
                      <Text style={styles.myPostEditText}>
                        {b.status === "rejected" ? "Edit and resubmit" : "Edit post"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <SearchField
                  value={blogQuery}
                  onChangeText={setBlogQuery}
                  placeholder="Search posts"
                  style={styles.sectionSearch}
                />
                {filteredBlogs.length === 0 && (
                  <Text style={styles.sectionEmpty}>No post matches that.</Text>
                )}
                {filteredBlogs.slice(0, PREVIEW_COUNT).map((item) => (
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
                        <Text style={styles.blogMeta}>💬 {item.comment_count}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                {viewAllRow(filteredBlogs.length, "posts", () =>
                  navigation.navigate("CommunityList", { kind: "blogs" })
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title="Community Room"
                summary={filteredRooms.length > 0 ? `${filteredRooms.length} rooms` : "No rooms yet"}
                premium
                icon="💬"
              >
                <SearchField
                  value={roomQuery}
                  onChangeText={setRoomQuery}
                  placeholder="Search rooms"
                  style={styles.sectionSearch}
                />
                {filteredRooms.length === 0 && (
                  <Text style={styles.sectionEmpty}>No room matches that.</Text>
                )}
                {filteredRooms.slice(0, PREVIEW_COUNT).map((room) => (
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
                {viewAllRow(filteredRooms.length, "rooms", () =>
                  navigation.navigate("CommunityList", { kind: "rooms" })
                )}
                {/* Create Room is deliberately gone from the app and the
                    website (client's call, Nov 2026) — rooms are opened
                    from the admin panel for now, so members join rather
                    than start them. Removed rather than disabled: a
                    dashed card that does nothing reads as broken. */}
              </CollapsibleSection>

              {/* Was a single "View Organisers" button, which made you
                  open a whole screen to find out whether anyone was
                  there. It now previews the same five-and-search shape
                  as the other two sections, with the row at the bottom
                  still leading to the directory where donating happens. */}
              <CollapsibleSection
                title="Support a Plays Organiser"
                summary={
                  filteredOrganisers.length > 0
                    ? `${filteredOrganisers.length} organisers to donate to`
                    : "Donate to independent theatre programs"
                }
                premium
                icon="🎭"
              >
                <Text style={styles.organiserIntro}>
                  Donate directly to organisers running independent theatre programs. theomy
                  doesn't handle the money.
                </Text>
                <SearchField
                  value={organiserQuery}
                  onChangeText={setOrganiserQuery}
                  placeholder="Search organisers"
                  style={styles.sectionSearch}
                />
                {filteredOrganisers.length === 0 && (
                  <Text style={styles.sectionEmpty}>
                    {organiserQuery.trim() || query.trim()
                      ? "No organiser matches that."
                      : "No organisers listed yet."}
                  </Text>
                )}
                {filteredOrganisers.slice(0, PREVIEW_COUNT).map((organiser) => (
                  <TouchableOpacity
                    key={organiser.id}
                    style={styles.roomCard}
                    onPress={() => navigation.navigate("Organisers")}
                  >
                    <View style={styles.roomIcon}>
                      {organiser.profile_photo_url ? (
                        <Image
                          source={{ uri: resolveMediaUrl(organiser.profile_photo_url) }}
                          style={styles.organiserAvatar}
                        />
                      ) : (
                        <Text style={styles.roomIconText}>
                          {organiser.name[0]?.toUpperCase() || "🎭"}
                        </Text>
                      )}
                    </View>
                    <View style={styles.roomInfo}>
                      <Text style={styles.roomTitle} numberOfLines={1}>
                        {organiser.name}
                      </Text>
                      <Text style={styles.roomAuthor}>Plays Organiser</Text>
                    </View>
                    <View style={styles.joinButton}>
                      <Text style={styles.joinButtonText}>🎁 Donate</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {/* Always shown, unlike the other two sections' rows:
                    donating happens on the directory screen, so it has
                    to stay one tap away even when every organiser is
                    already listed above. */}
                <TouchableOpacity
                  style={styles.viewAllRow}
                  onPress={() => navigation.navigate("Organisers")}
                >
                  <Text style={styles.viewAllText}>
                    {filteredOrganisers.length > PREVIEW_COUNT
                      ? `View all ${filteredOrganisers.length} organisers`
                      : "Open the organiser directory"}
                  </Text>
                  <Text style={styles.viewAllChevron}>›</Text>
                </TouchableOpacity>
              </CollapsibleSection>
            </View>
          </View>
        </ScrollView>
      )}

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
  // Each section is now its own premium card, so this is just a spaced
  // column (previously one shared flat card).
  sectionsCard: {
    marginHorizontal: 16,
    marginTop: 18,
    gap: 14,
  },
  // Every section opens with its own search box, inset to line up with
  // the cards under it.
  sectionSearch: { marginHorizontal: 16, marginTop: 14, marginBottom: 4 },
  createBlogButton: {
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: COLORS.gold,
    alignItems: "center",
  },
  createBlogText: { color: COLORS.ctaText, fontSize: 13, fontWeight: "800" },
  myPostCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  myPostBadge: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  myPostBadgeWaiting: { color: COLORS.gold },
  myPostBadgeBad: { color: "#f87171" },
  myPostTitle: { color: COLORS.cream, fontSize: 14, fontWeight: "700", marginTop: 4 },
  myPostNote: { color: "#f87171", fontSize: 12, marginTop: 6, lineHeight: 17 },
  myPostEdit: { marginTop: 10, alignSelf: "flex-start" },
  myPostEditText: { color: COLORS.gold, fontSize: 13, fontWeight: "700" },
  sectionEmpty: {
    color: COLORS.cream,
    opacity: 0.6,
    fontSize: 13,
    marginHorizontal: 16,
    marginTop: 14,
  },
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginHorizontal: 16,
    marginTop: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "rgba(212,175,55,0.1)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
  },
  viewAllText: { color: COLORS.gold, fontSize: 13, fontWeight: "700" },
  viewAllChevron: { color: COLORS.gold, fontSize: 16, lineHeight: 18 },
  blogCard: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
    gap: 12,
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
  organiserIntro: {
    color: COLORS.cream,
    opacity: 0.7,
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 16,
    marginTop: 14,
  },
  organiserAvatar: { width: 36, height: 36, borderRadius: 18 },
});
