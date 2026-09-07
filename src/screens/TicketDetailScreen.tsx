import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { resolveMediaUrl } from "@/api/apiClient";
import { toggleMyList } from "@/api/videos";
import { fetchMyList } from "@/api/mylist";
import { ApprovedEvent } from "@/api/ticketing";
import { COLORS } from "@/theme/colors";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function TicketDetailScreen() {
  const route = useRoute<any>();
  const event: ApprovedEvent = route.params.event;
  const [inMyList, setInMyList] = useState(false);
  const lowestPrice = event.ticket_tiers.length
    ? Math.min(...event.ticket_tiers.map((t) => parseFloat(t.price)))
    : null;

  // ApprovedEvent doesn't carry its own "already saved" flag (unlike Video,
  // which has in_my_list) — check against the real list on open so a
  // previously-saved event shows the checkmark immediately, not just
  // right after tapping it in this same session.
  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMyList();
        setInMyList(list.some((item) => item.item_id === event.id));
      } catch {
        // Leave it as not-saved — worst case the button just starts at "+".
      }
    })();
  }, [event.id]);

  const handleAddToList = async () => {
    setInMyList(!inMyList);
    try {
      // Confirmed payload shape from a real network capture.
      const res = await toggleMyList({
        item_id: event.id,
        title: event.event_title,
        image_url: event.poster_image_url,
        meta: `${event.venue} · ${formatDate(event.proposed_date)}, ${event.proposed_time}`,
        section: "Theater",
      });
      setInMyList(res.saved);
    } catch {
      setInMyList(inMyList);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Image
        source={{ uri: resolveMediaUrl(event.poster_image_url) }}
        style={styles.poster}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <Text style={styles.title}>{event.event_title}</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() =>
              Alert.alert("Coming soon", "Ticket booking hasn't been added yet.")
            }
          >
            <Text style={styles.bookButtonText}>
              🎟 Book Tickets{lowestPrice != null ? ` — From ₹${lowestPrice}` : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, inMyList && styles.addButtonActive]}
            onPress={handleAddToList}
          >
            <Text style={[styles.addButtonText, inMyList && styles.addButtonTextActive]}>
              {inMyList ? "✓" : "+"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>📍 {event.venue}</Text>
          <Text style={styles.metaText}>
            📅 {formatDate(event.proposed_date)}, {event.proposed_time}
          </Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{event.event_category}</Text>
          </View>
        </View>

        <Text style={styles.description}>{event.event_description}</Text>
        <Text style={styles.presentedBy}>Presented by {event.org_name}</Text>

        {event.ticket_tiers.length > 0 && (
          <View style={styles.tiersSection}>
            {event.ticket_tiers.map((tier) => (
              <View key={tier.id} style={styles.tierRow}>
                <Text style={styles.tierName}>{tier.tier_name}</Text>
                <Text style={styles.tierPrice}>₹{parseFloat(tier.price)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  poster: { width: "100%", aspectRatio: 16 / 10, backgroundColor: COLORS.burgundyDark },
  content: { padding: 16 },
  title: { color: COLORS.cream, fontSize: 22, fontWeight: "700" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  bookButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  bookButtonText: { color: COLORS.ctaText, fontSize: 14, fontWeight: "700" },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { color: COLORS.cream, fontSize: 18 },
  addButtonActive: { borderColor: COLORS.gold, backgroundColor: "rgba(212,175,55,0.15)" },
  addButtonTextActive: { color: COLORS.gold },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 16 },
  metaText: { color: COLORS.cream, opacity: 0.8, fontSize: 13 },
  categoryBadge: {
    backgroundColor: "rgba(212,175,55,0.15)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryBadgeText: { color: COLORS.gold, fontSize: 11, fontWeight: "600" },
  description: { color: COLORS.cream, opacity: 0.85, fontSize: 14, lineHeight: 20, marginTop: 16 },
  presentedBy: { color: COLORS.cream, opacity: 0.6, fontSize: 12, marginTop: 10 },
  tiersSection: { marginTop: 24 },
  tierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  tierName: { color: COLORS.cream, fontSize: 14, fontWeight: "600" },
  tierPrice: { color: COLORS.gold, fontSize: 14, fontWeight: "700" },
});
