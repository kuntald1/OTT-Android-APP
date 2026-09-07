import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fetchOrganisers, Organiser } from "@/api/community";
import { resolveMediaUrl } from "@/api/apiClient";
import { COLORS } from "@/theme/colors";

// Donation flow itself isn't confirmed against a real endpoint yet — the
// Donate button acknowledges that for now, rather than guessing a payment
// API and risking another broken flow like the earlier ones that needed
// correcting.
export default function OrganisersScreen() {
  const [organisers, setOrganisers] = useState<Organiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          renderItem={({ item }) => (
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
                <TouchableOpacity
                  style={styles.donateButton}
                  onPress={() =>
                    Alert.alert("Coming soon", "The donation flow hasn't been added yet.")
                  }
                >
                  <Text style={styles.donateButtonText}>🎁 Donate</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
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
  errorText: { color: COLORS.burgundyLight },
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
});
