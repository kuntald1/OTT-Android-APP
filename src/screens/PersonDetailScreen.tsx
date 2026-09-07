import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { resolveMediaUrl } from "@/api/apiClient";
import { fetchPerson } from "@/api/people";
import { Person } from "@/types";
import { COLORS } from "@/theme/colors";

// The cast/crew data embedded in a video's detail already carries the full
// bio (about, early_life, etc.), so if it's passed via navigation params we
// show it immediately with no extra request. Falls back to GET /people/{id}
// (confirmed) when only an id is available.
export default function PersonDetailScreen() {
  const route = useRoute<any>();
  const passedPerson: Person | undefined = route.params?.person;
  const personId: string | undefined = route.params?.personId;

  const [person, setPerson] = useState<Person | undefined>(passedPerson);
  const [loading, setLoading] = useState(!passedPerson);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (passedPerson || !personId) return;
    (async () => {
      try {
        const data = await fetchPerson(personId);
        setPerson(data);
      } catch {
        setError("Couldn't load this page");
      } finally {
        setLoading(false);
      }
    })();
  }, [personId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  if (error || !person) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Not found"}</Text>
      </View>
    );
  }

  const bioSections: [string, string | null | undefined][] = [
    ["About", person.about],
    ["Early Life", person.early_life],
    ["Personal Life", person.personal_life],
    ["Debut & Initial Years", person.debut_initial_years],
    ["Breakthrough & Beyond", person.breakthrough_beyond],
    ["Recent Projects", person.recent_projects],
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: resolveMediaUrl(person.photo_url) }} style={styles.photo} />
        <Text style={styles.name}>{person.name}</Text>
        {person.occupation && <Text style={styles.occupation}>{person.occupation}</Text>}
        {(person.birthplace || person.date_of_birth) && (
          <Text style={styles.meta}>
            {person.birthplace}
            {person.date_of_birth ? ` · Born ${new Date(person.date_of_birth).toLocaleDateString()}` : ""}
          </Text>
        )}
      </View>

      <View style={styles.content}>
        {bioSections
          .filter(([, text]) => !!text)
          .map(([heading, text]) => (
            <View key={heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{heading}</Text>
              <Text style={styles.sectionText}>{text}</Text>
            </View>
          ))}
      </View>
    </ScrollView>
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
  header: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16 },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.burgundyDark,
    marginBottom: 12,
  },
  name: { color: COLORS.cream, fontSize: 20, fontWeight: "700", textAlign: "center" },
  occupation: { color: COLORS.gold, fontSize: 14, marginTop: 4 },
  meta: { color: COLORS.cream, opacity: 0.6, fontSize: 12, marginTop: 4, textAlign: "center" },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  section: { marginBottom: 20 },
  sectionHeading: { color: COLORS.gold, fontSize: 13, fontWeight: "700", marginBottom: 6 },
  sectionText: { color: COLORS.cream, opacity: 0.85, fontSize: 14, lineHeight: 20 },
});
