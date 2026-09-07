import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchMyList, MyListItem } from "@/api/mylist";
import { fetchPlays, fetchArchive, toggleMyList } from "@/api/videos";
import { fetchApprovedEvents, ApprovedEvent } from "@/api/ticketing";
import { resolveMediaUrl } from "@/api/apiClient";
import { Video } from "@/types";
import { COLORS } from "@/theme/colors";
import AppHeader from "@/components/AppHeader";
import GradientBackground from "@/components/GradientBackground";

// My List items only carry a summary (id, title, image, meta, section) — to
// open the full detail screen we need the full object, so this looks each
// item up against the Plays/Archive catalogs or the approved-events list
// (by id), based on which section it was saved from.
export default function MyListScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<MyListItem[]>([]);
  const [catalog, setCatalog] = useState<Video[]>([]);
  const [events, setEvents] = useState<ApprovedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await fetchMyList();
      setItems(list);
    } catch {
      setError("Couldn't load, try again");
    }
    try {
      const [plays, archive] = await Promise.all([fetchPlays(), fetchArchive()]);
      setCatalog([...plays, ...archive]);
    } catch {
      setCatalog([]);
    }
    try {
      setEvents(await fetchApprovedEvents());
    } catch {
      setEvents([]);
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

  const handleRemove = async (item: MyListItem) => {
    setItems((prev) => prev.filter((i) => i.item_id !== item.item_id));
    try {
      await toggleMyList({
        item_id: item.item_id,
        title: item.title,
        image_url: item.image_url,
        meta: item.meta,
        section: item.section,
      });
    } catch {
      // Re-add on failure.
      setItems((prev) => [...prev, item]);
    }
  };

  const handleOpen = (item: MyListItem) => {
    if (item.section === "Theater") {
      const event = events.find((e) => e.id === item.item_id);
      if (event) navigation.navigate("TicketDetail", { event });
      return;
    }
    const video = catalog.find((v) => v.id === item.item_id);
    if (video) navigation.navigate("VideoDetail", { video });
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.title.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <GradientBackground style={styles.screen}>
      <AppHeader activeRoute="MyList" onSearch={setQuery} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Your list is empty</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleOpen(item)}>
              <View style={styles.posterWrap}>
                <Image
                  source={{ uri: resolveMediaUrl(item.image_url) }}
                  style={styles.poster}
                  resizeMode="cover"
                />
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{item.section.toUpperCase()}</Text>
                </View>
                <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item)}>
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.meta}>{item.meta}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  errorText: { color: COLORS.burgundyLight },
  grid: { padding: 12 },
  card: { flex: 1, margin: 6, maxWidth: "47%" },
  posterWrap: { position: "relative" },
  poster: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: COLORS.burgundyDark,
  },
  sectionBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  sectionBadgeText: { color: COLORS.gold, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: { color: "#fff", fontSize: 13 },
  title: { color: COLORS.cream, marginTop: 6, fontSize: 13 },
  meta: { color: COLORS.gold, fontSize: 11, marginTop: 2 },
});
