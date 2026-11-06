import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  fetchOrganisers,
  fetchOrganiserDonationDetails,
  Organiser,
  OrganiserDonationDetails,
} from "@/api/community";
import { resolveMediaUrl, extractErrorMessage } from "@/api/apiClient";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/theme/colors";

// ---------------------------------------------------------------------------
// Donating does NOT take a payment here. theomy shows the organiser's
// own QR code and bank details and steps out of the way, so the money
// goes straight to them — the same flow as the website's DonationPage.
//
// Because nothing is charged inside the app, this is also outside
// Google Play's billing requirement entirely: no digital goods change
// hands, and theomy never touches the money.
// ---------------------------------------------------------------------------

export default function OrganisersScreen() {
  const { user } = useAuth();
  const [organisers, setOrganisers] = useState<Organiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Organiser | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setOrganisers(await fetchOrganisers());
      } catch {
        setError("Couldn't load organisers");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Support a Plays Organiser</Text>
        <Text style={styles.subtitle}>Donate directly to registered organisers on theomy.</Text>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={organisers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isMe = !!user && item.id === user.id;
            return (
              <View style={styles.card}>
                <View style={styles.avatar}>
                  {item.profile_photo_url ? (
                    <Image source={{ uri: resolveMediaUrl(item.profile_photo_url) }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitial}>{item.name[0]?.toUpperCase()}</Text>
                  )}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.role}>Plays Organiser</Text>

                  {/* Nobody donates to themselves. */}
                  {isMe ? (
                    <Text style={styles.selfNote}>This is you — supporters see a Donate button here.</Text>
                  ) : (
                    <TouchableOpacity style={styles.donateButton} onPress={() => setSelected(item)}>
                      <Text style={styles.donateButtonText}>🎁 Donate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      <DonateSheet organiser={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

function DonateSheet({
  organiser,
  onClose,
}: {
  organiser: Organiser | null;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<OrganiserDonationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organiser) {
      setDetails(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    fetchOrganiserDonationDetails(organiser.id)
      .then(setDetails)
      .catch((e) => setError(extractErrorMessage(e, "Couldn't load this organiser's details.")))
      .finally(() => setLoading(false));
  }, [organiser?.id]);

  const qrUrl = details?.qr_code_url ? resolveMediaUrl(details.qr_code_url) : undefined;
  const hasDetails = !!(details && (details.qr_code_url || details.account_number || details.ifsc_code));

  return (
    <Modal visible={!!organiser} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetTitle}>Donate to {organiser?.name}</Text>
            <Text style={styles.sheetSubtitle}>{details?.group_name || "Plays Organiser"}</Text>

            {loading && <ActivityIndicator color={COLORS.gold} style={{ marginTop: 24 }} />}
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {details && !hasDetails && (
              <Text style={styles.plain}>This organiser hasn't added payment details yet.</Text>
            )}

            {!!qrUrl && (
              <>
                <Text style={styles.sectionLabel}>SCAN TO PAY</Text>
                <View style={styles.qrWrap}>
                  <Image source={{ uri: qrUrl }} style={styles.qr} resizeMode="contain" />
                </View>
              </>
            )}

            {!!(details?.account_number || details?.ifsc_code) && (
              <>
                <Text style={styles.sectionLabel}>BANK TRANSFER</Text>
                {!!details?.account_number && (
                  <DetailRow label="Account number" value={details.account_number} />
                )}
                {!!details?.ifsc_code && (
                  <DetailRow label="IFSC" value={details.ifsc_code} />
                )}
              </>
            )}

            {hasDetails && (
              <Text style={styles.disclaimer}>
                Long-press an account number to copy it. Payment goes directly to the organiser —
                theomy doesn't handle the money and can't confirm or refund it, so keep your own
                receipt.
              </Text>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      {/* selectable, so a long press copies it — no clipboard library
          and so no native dependency to repair after each prebuild. */}
      <Text style={styles.detailValue} selectable>{value}</Text>
    </View>
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
  errorText: { color: COLORS.burgundyLight, marginTop: 16 },
  header: { padding: 16 },
  title: { color: COLORS.cream, fontSize: 22, fontWeight: "800" },
  subtitle: { color: COLORS.cream, opacity: 0.7, fontSize: 13, marginTop: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  card: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    backgroundColor: COLORS.burgundyMuted,
    gap: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.4)",
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarInitial: { color: COLORS.gold, fontWeight: "700", fontSize: 16 },
  cardInfo: { flex: 1 },
  name: { color: COLORS.cream, fontSize: 16, fontWeight: "700" },
  role: { color: COLORS.gold, fontSize: 12, marginTop: 2 },
  selfNote: { color: COLORS.textMuted, fontSize: 12, marginTop: 10 },
  donateButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 10,
  },
  donateButtonText: { color: COLORS.gold, fontSize: 13, fontWeight: "700" },

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    padding: 20,
    maxHeight: "85%",
  },
  sheetTitle: { color: COLORS.cream, fontSize: 18, fontWeight: "700" },
  sheetSubtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, marginBottom: 8 },
  sectionLabel: { color: COLORS.textFaint, fontSize: 11, letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  plain: { color: COLORS.cream, fontSize: 14, marginTop: 16 },
  qrWrap: { alignSelf: "center", backgroundColor: "#fff", borderRadius: 10, padding: 10 },
  qr: { width: 190, height: 190 },
  detailRow: {
    backgroundColor: "rgba(245,235,221,0.05)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  detailLabel: { color: COLORS.textFaint, fontSize: 11 },
  detailValue: { color: COLORS.cream, fontSize: 15, marginTop: 2 },
  disclaimer: { color: COLORS.textFaint, fontSize: 12, lineHeight: 18, marginTop: 18 },
  closeButton: { alignSelf: "center", marginTop: 20, marginBottom: 8, padding: 8 },
  closeButtonText: { color: COLORS.textMuted, fontSize: 14 },
});
