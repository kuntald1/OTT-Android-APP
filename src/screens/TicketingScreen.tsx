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
import { fetchApprovedEvents, fetchTheaterHeroSlides, ApprovedEvent, TheaterHeroSlide } from "@/api/ticketing";
import { resolveMediaUrl } from "@/api/apiClient";
import { COLORS } from "@/theme/colors";
import AppHeader from "@/components/AppHeader";
import GradientBackground from "@/components/GradientBackground";
import CollapsibleSection from "@/components/CollapsibleSection";

const SLIDE_INTERVAL_MS = 5000;

// Category chips match the theatre categories already seen elsewhere in
// the app's video data (Drama, Bengali Theatre, Musical Theatre, etc.) —
// there's no dedicated categories endpoint confirmed for Ticketing, so
// this mirrors the same known taxonomy rather than inventing new labels.
const CATEGORIES = [
  "Bengali Theatre",
  "Drama",
  "Comedy",
  "Musical Theatre",
  "Classical Theatre",
  "Experimental Theatre",
];
const DATE_FILTERS = ["Today", "Tomorrow", "This Weekend"];
const PRICE_FILTERS = ["Free", "0-500", "501-2000", "Above 2000"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function matchesDateFilter(iso: string, filter: string): boolean {
  const eventDate = new Date(iso);
  const now = new Date();
  if (filter === "Today") return isSameDay(eventDate, now);
  if (filter === "Tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return isSameDay(eventDate, tomorrow);
  }
  if (filter === "This Weekend") {
    const day = eventDate.getDay();
    const diffDays = (eventDate.getTime() - now.getTime()) / 86400000;
    return diffDays >= 0 && diffDays <= 7 && (day === 0 || day === 6);
  }
  return true;
}

function matchesPriceFilter(event: ApprovedEvent, filter: string): boolean {
  const min = event.ticket_tiers.length ? Math.min(...event.ticket_tiers.map((t) => parseFloat(t.price))) : 0;
  if (filter === "Free") return min === 0;
  if (filter === "0-500") return min >= 0 && min <= 500;
  if (filter === "501-2000") return min > 500 && min <= 2000;
  if (filter === "Above 2000") return min > 2000;
  return true;
}

export default function TicketingScreen() {
  const navigation = useNavigation<any>();
  const [slides, setSlides] = useState<TheaterHeroSlide[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [events, setEvents] = useState<ApprovedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [venue, setVenue] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      setEvents(await fetchApprovedEvents());
    } catch {
      setError("Couldn't load, try again");
    }
    try {
      setSlides(await fetchTheaterHeroSlides());
    } catch {
      setSlides([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setSlideIndex((i) => (i + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [slides.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const venues = useMemo(() => [...new Set(events.map((e) => e.venue))], [events]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (q && !e.event_title.toLowerCase().includes(q)) return false;
      if (category && e.event_category !== category) return false;
      if (venue && e.venue !== venue) return false;
      if (dateFilter && !matchesDateFilter(e.proposed_date, dateFilter)) return false;
      if (price && !matchesPriceFilter(e, price)) return false;
      return true;
    });
  }, [events, category, venue, dateFilter, price, query]);

  const activeSlide = slides[slideIndex];
  const activeFilterCount = [category, dateFilter, venue, price].filter(Boolean).length;

  const renderChip = (label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <GradientBackground style={styles.screen}>
      <AppHeader activeRoute="Ticketing" onSearch={setQuery} showSwitcher />

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
          {activeSlide && (
            <View style={styles.hero}>
              <Image
                source={{ uri: resolveMediaUrl(activeSlide.image_url) }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <View style={styles.heroOverlay} />
              <View style={styles.heroText}>
                <Text style={styles.heroCategory}>{activeSlide.category.toUpperCase()}</Text>
                <Text style={styles.heroTitle}>{activeSlide.title}</Text>
                <Text style={styles.heroVenue}>{activeSlide.venue}</Text>
              </View>
              {slides.length > 1 && (
                <View style={styles.dotsRow}>
                  {slides.map((s, i) => (
                    <View key={s.id} style={[styles.dot, i === slideIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.filtersCard}>
            <CollapsibleSection
              title="Filters"
              summary={activeFilterCount > 0 ? `${activeFilterCount} active` : "All events"}
              divider={false}
            >
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>CATEGORY</Text>
                <View style={styles.chipRow}>
                  {CATEGORIES.map((c) =>
                    renderChip(c, category === c, () => setCategory(category === c ? null : c))
                  )}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>DATE</Text>
                <View style={styles.chipRow}>
                  {DATE_FILTERS.map((d) =>
                    renderChip(d, dateFilter === d, () => setDateFilter(dateFilter === d ? null : d))
                  )}
                </View>
              </View>

              {venues.length > 0 && (
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>VENUE</Text>
                  <View style={styles.chipRow}>
                    {venues.map((v) =>
                      renderChip(v, venue === v, () => setVenue(venue === v ? null : v))
                    )}
                  </View>
                </View>
              )}

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>PRICE</Text>
                <View style={styles.chipRow}>
                  {PRICE_FILTERS.map((p) =>
                    renderChip(p, price === p, () => setPrice(price === p ? null : p))
                  )}
                </View>
              </View>
            </CollapsibleSection>
          </View>

          <View style={styles.eventsGrid}>
            {filteredEvents.length === 0 ? (
              <Text style={styles.emptyText}>No events match these filters</Text>
            ) : (
              filteredEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => navigation.navigate("TicketDetail", { event })}
                >
                  <Image
                    source={{ uri: resolveMediaUrl(event.poster_image_url) }}
                    style={styles.eventPoster}
                    resizeMode="cover"
                  />
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {event.event_title}
                  </Text>
                  <Text style={styles.eventMeta}>📍 {event.venue}</Text>
                  <Text style={styles.eventMeta}>
                    📅 {new Date(event.proposed_date).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                    , {event.proposed_time}
                  </Text>
                </TouchableOpacity>
              ))
            )}
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
    height: 220,
    backgroundColor: COLORS.burgundyDark,
    justifyContent: "flex-end",
    padding: 16,
    overflow: "hidden",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(36, 0, 7, 0.55)",
  },
  heroText: { marginBottom: 8 },
  heroCategory: { color: COLORS.gold, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  heroTitle: { color: COLORS.cream, fontSize: 22, fontWeight: "800", marginTop: 4 },
  heroVenue: { color: COLORS.cream, opacity: 0.85, fontSize: 13, marginTop: 4 },
  dotsRow: { flexDirection: "row", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { backgroundColor: COLORS.gold },
  filtersCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: COLORS.burgundyMuted,
    overflow: "hidden",
  },
  filterGroup: { paddingHorizontal: 16, marginBottom: 16 },
  filterLabel: { color: COLORS.cream, opacity: 0.5, fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.4)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  chipText: { color: COLORS.cream, fontSize: 12 },
  chipTextActive: { color: COLORS.ctaText, fontWeight: "700" },
  eventsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    marginTop: 20,
  },
  emptyText: { color: COLORS.cream, opacity: 0.6, marginLeft: 6 },
  eventCard: { width: "50%", padding: 6 },
  eventPoster: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: COLORS.burgundyDark,
  },
  eventTitle: { color: COLORS.cream, fontSize: 13, fontWeight: "700", marginTop: 6 },
  eventMeta: { color: COLORS.cream, opacity: 0.6, fontSize: 11, marginTop: 2 },
});
