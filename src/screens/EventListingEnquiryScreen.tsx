import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchMyEventEnquiries, MyEventEnquiry } from "@/api/ticketing";
import { resolveMediaUrl } from "@/api/apiClient";
import { COLORS, SPACING, TYPE } from "@/theme";

// View-only on mobile — the web app's "Change poster"/"Copy public link"
// actions aren't reproduced here, only the enquiry list and its status.
export default function EventListingEnquiryScreen() {
  const [enquiries, setEnquiries] = useState<MyEventEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setEnquiries(await fetchMyEventEnquiries());
    } catch {
      setError("Couldn't load your enquiries");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const statusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return styles.statusApproved;
      case "rejected":
        return styles.statusRejected;
      default:
        return styles.statusPending;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
    >
      {error && <Text style={styles.errorText}>{error}</Text>}

      {!error && enquiries.length === 0 && (
        <Text style={styles.emptyText}>You haven't submitted any event enquiries yet.</Text>
      )}

      {enquiries.map((enquiry) => (
        <View key={enquiry.id} style={styles.card}>
          <View style={styles.cardHeader}>
            {enquiry.poster_image_url && (
              <Image
                source={{ uri: resolveMediaUrl(enquiry.poster_image_url) }}
                style={styles.poster}
                resizeMode="cover"
              />
            )}
            <View style={styles.cardHeaderText}>
              <Text style={styles.title} numberOfLines={2}>
                {enquiry.event_title}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {enquiry.event_category} · {enquiry.org_name}
              </Text>
              <View style={[styles.statusBadge, statusStyle(enquiry.status)]}>
                <Text style={styles.statusText}>
                  {enquiry.status.charAt(0).toUpperCase() + enquiry.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.detailLine}>
            {enquiry.venue} · {new Date(enquiry.proposed_date).toLocaleDateString()} · {enquiry.proposed_time}
          </Text>

          {enquiry.ticket_tiers.length > 0 && (
            <Text style={styles.tierLine} numberOfLines={2}>
              {enquiry.ticket_tiers
                .map((t) => `${t.tier_name} ₹${t.price} × ${t.quantity}`)
                .join(" · ")}
            </Text>
          )}

          {enquiry.admin_note && (
            <View style={styles.adminNoteBox}>
              <Text style={styles.adminNoteLabel}>Note from admin</Text>
              <Text style={styles.adminNoteText}>{enquiry.admin_note}</Text>
            </View>
          )}

          {enquiry.attachments.length > 0 && (
            <View style={styles.attachmentsRow}>
              {enquiry.attachments.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.attachmentChip}
                  onPress={() => Linking.openURL(resolveMediaUrl(a.file_url)!)}
                >
                  <Text style={styles.attachmentText} numberOfLines={1}>
                    📎 {a.original_filename}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.submittedText}>
            Submitted {new Date(enquiry.created_at).toLocaleDateString()}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: { ...TYPE.body, color: COLORS.burgundyLight, textAlign: "center", marginTop: SPACING.xl },
  emptyText: { ...TYPE.body, color: COLORS.textMuted, textAlign: "center", marginTop: SPACING.xl },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  cardHeader: { flexDirection: "row", gap: SPACING.md },
  poster: { width: 64, height: 64, borderRadius: 8, backgroundColor: COLORS.burgundyDark },
  cardHeaderText: { flex: 1, justifyContent: "center" },
  title: { ...TYPE.body, color: COLORS.cream, fontWeight: "700", fontSize: 15 },
  meta: { ...TYPE.caption, color: COLORS.gold, marginTop: 2 },
  statusBadge: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  statusApproved: { backgroundColor: "rgba(74,222,128,0.18)" },
  statusPending: { backgroundColor: "rgba(250,204,21,0.18)" },
  statusRejected: { backgroundColor: "rgba(248,113,113,0.18)" },
  statusText: { ...TYPE.caption, color: COLORS.cream, fontSize: 11, fontWeight: "700" },
  detailLine: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 10 },
  tierLine: { ...TYPE.caption, color: COLORS.gold, marginTop: 6 },
  adminNoteBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: 10,
  },
  adminNoteLabel: { ...TYPE.caption, color: COLORS.textMuted, fontSize: 10, letterSpacing: 0.5 },
  adminNoteText: { ...TYPE.caption, color: COLORS.cream, marginTop: 2 },
  attachmentsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  attachmentChip: {
    backgroundColor: "rgba(212,162,68,0.15)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 200,
  },
  attachmentText: { ...TYPE.caption, color: COLORS.gold, fontSize: 11 },
  submittedText: { ...TYPE.caption, color: COLORS.textMuted, fontSize: 11, marginTop: 10 },
});
