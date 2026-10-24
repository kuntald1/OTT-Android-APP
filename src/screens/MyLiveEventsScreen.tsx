import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  createMyLiveEvent,
  deleteMyLiveEvent,
  endMyLiveEvent,
  fetchMyLiveEvents,
  MyLiveEvent,
} from "@/api/liveEvents";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";

// Organiser-only ("plays_organiser" role) — reached from the profile menu.
// Mirrors the web "My Live Events" page: create an event, then point OBS
// (on a computer) at the RTMP URL + Stream Key shown on its card. The
// phone itself doesn't broadcast — it manages events and shares the key.
// Larix / PRISM / most phone broadcasters take ONE line: the server URL with
// the stream key on the end. Mux's RTMP ingest (port 5222) has an RTMPS twin on
// port 443, which gets through restrictive networks far more reliably, so that's
// what we hand the organiser. Anything that isn't that exact shape is passed
// through untouched with the key appended.
function broadcastUrl(rtmpUrl: string, streamKey: string): string {
  const base = (rtmpUrl || "").replace(/\/+$/, "");
  const secure = base.startsWith("rtmp://")
    ? base.replace(/^rtmp:\/\//, "rtmps://").replace(/:5222(?=\/|$)/, ":443")
    : base;
  return `${secure}/${streamKey}`;
}

function errMsg(e: any, fallback = "Something went wrong. Please try again."): string {
  return e?.response?.data?.detail || e?.message || fallback;
}

type Section = "play" | "archive" | "both";
const SECTIONS: { value: Section; label: string }[] = [
  { value: "both", label: "Both" },
  { value: "play", label: "Plays" },
  { value: "archive", label: "Archive" },
];

export default function MyLiveEventsScreen() {
  const [events, setEvents] = useState<MyLiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [section, setSection] = useState<Section>("both");
  const [creating, setCreating] = useState(false);

  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [urlRevealed, setUrlRevealed] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setEvents(await fetchMyLiveEvents());
    } catch (e) {
      setError(errMsg(e, "Couldn't load your live events"));
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

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Title needed", "Please enter a title for your live event.");
      return;
    }
    setCreating(true);
    try {
      const created = await createMyLiveEvent(title.trim(), description.trim(), section);
      setEvents((prev) => [created, ...prev]);
      setRevealed((prev) => ({ ...prev, [created.id]: true }));
      setTitle("");
      setDescription("");
      setSection("both");
      setShowForm(false);
    } catch (e) {
      Alert.alert("Couldn't create event", errMsg(e));
    } finally {
      setCreating(false);
    }
  };

  const handleEnd = async (ev: MyLiveEvent) => {
    setBusyId(ev.id);
    try {
      const updated = await endMyLiveEvent(ev.id);
      setEvents((prev) => prev.map((x) => (x.id === ev.id ? updated : x)));
    } catch (e) {
      Alert.alert("Couldn't end event", errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (ev: MyLiveEvent) => {
    Alert.alert(
      "Delete this live event?",
      "The RTMP URL and Stream Key will stop working permanently. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusyId(ev.id);
            try {
              await deleteMyLiveEvent(ev.id);
              setEvents((prev) => prev.filter((x) => x.id !== ev.id));
            } catch (e) {
              Alert.alert("Couldn't delete event", errMsg(e));
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const shareText = async (label: string, value: string) => {
    try {
      await Share.share({ message: value, title: label });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  const maskKey = (k: string) => "•".repeat(Math.min(k.length, 24));

  return (
    <GradientBackground style={styles.screen}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
        >
          <Text style={styles.intro}>
            Point OBS (or similar broadcast software on a computer) at the RTMP URL + Stream Key below to go live.
          </Text>

          {showForm ? (
            <View style={styles.formCard}>
              <TextInput
                style={styles.input}
                placeholder="Title"
                placeholderTextColor={COLORS.textFaint}
                value={title}
                onChangeText={setTitle}
                maxLength={200}
              />
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="Description (optional)"
                placeholderTextColor={COLORS.textFaint}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={2000}
              />
              <View style={styles.chipRow}>
                {SECTIONS.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.chip, section === s.value && styles.chipActive]}
                    onPress={() => setSection(s.value)}
                  >
                    <Text style={[styles.chipText, section === s.value && styles.chipTextActive]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.formButtons}>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setShowForm(false)} disabled={creating}>
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleCreate} disabled={creating}>
                  {creating ? (
                    <ActivityIndicator color={COLORS.ctaText} size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.newBtn} onPress={() => setShowForm(true)}>
              <Text style={styles.newBtnText}>+ New live event</Text>
            </TouchableOpacity>
          )}

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : events.length === 0 ? (
            <Text style={styles.emptyText}>No live events yet. Tap "New live event" to create one.</Text>
          ) : (
            events.map((ev) => {
              const live = ev.status === "active";
              const show = !!revealed[ev.id];
              const showUrl = !!urlRevealed[ev.id];
              const fullUrl = broadcastUrl(ev.rtmp_url, ev.stream_key);
              return (
                <View key={ev.id} style={styles.card}>
                  <View style={styles.cardHead}>
                    <Text style={styles.title} numberOfLines={2}>
                      {ev.title}
                    </Text>
                    <View style={[styles.badge, live && styles.badgeLive]}>
                      <Text style={[styles.badgeText, live && styles.badgeTextLive]}>{live ? "LIVE" : "Idle"}</Text>
                    </View>
                  </View>

                  <Text style={styles.label}>RTMP URL</Text>
                  <View style={styles.valueRow}>
                    <Text style={styles.value} selectable numberOfLines={1}>
                      {ev.rtmp_url}
                    </Text>
                    <TouchableOpacity onPress={() => shareText("RTMP URL", ev.rtmp_url)}>
                      <Text style={styles.link}>Share</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Stream Key</Text>
                  <View style={styles.valueRow}>
                    <Text style={styles.value} selectable={show} numberOfLines={1}>
                      {show ? ev.stream_key : maskKey(ev.stream_key)}
                    </Text>
                    <TouchableOpacity onPress={() => setRevealed((p) => ({ ...p, [ev.id]: !show }))}>
                      <Text style={styles.link}>{show ? "Hide" : "Show"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => shareText("Stream Key", ev.stream_key)}>
                      <Text style={styles.link}>Share</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.warn}>Keep your Stream Key private — anyone with it can broadcast as you.</Text>

                  <Text style={styles.label}>Broadcast URL (phone apps)</Text>
                  <View style={styles.valueRow}>
                    <Text style={styles.value} selectable={showUrl} numberOfLines={1}>
                      {showUrl ? fullUrl : maskKey(fullUrl)}
                    </Text>
                    <TouchableOpacity onPress={() => setUrlRevealed((p) => ({ ...p, [ev.id]: !showUrl }))}>
                      <Text style={styles.link}>{showUrl ? "Hide" : "Show"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => shareText("Broadcast URL", fullUrl)}>
                      <Text style={styles.link}>Share</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.hint}>
                    One line for Larix / PRISM on a phone — it already has your Stream Key on the end, so paste it
                    as the connection URL and nothing else. OBS on a computer wants the two fields above instead.
                  </Text>

                  <Text style={styles.label}>Playback URL</Text>
                  <View style={styles.valueRow}>
                    <Text style={styles.value} selectable numberOfLines={1}>
                      {ev.playback_url}
                    </Text>
                    <TouchableOpacity onPress={() => shareText("Playback URL", ev.playback_url)}>
                      <Text style={styles.link}>Share</Text>
                    </TouchableOpacity>
                  </View>

                  {!live && (
                    <Text style={styles.ready}>
                      Ready to broadcast — start streaming from OBS using the details above. No need to create a new event.
                    </Text>
                  )}

                  <View style={styles.actions}>
                    {live && (
                      <TouchableOpacity
                        style={styles.endBtn}
                        onPress={() => handleEnd(ev)}
                        disabled={busyId === ev.id}
                      >
                        <Text style={styles.endBtnText}>{busyId === ev.id ? "Ending…" : "End"}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(ev)}
                      disabled={busyId === ev.id}
                    >
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  intro: { ...TYPE.body, color: COLORS.textMuted },
  errorText: { ...TYPE.body, color: "#f87171", textAlign: "center" },
  emptyText: { ...TYPE.body, color: COLORS.textMuted, textAlign: "center", marginTop: SPACING.lg },

  newBtn: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
  },
  newBtnText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },

  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  input: {
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.cream,
    fontSize: 14,
  },
  inputMulti: { minHeight: 70, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceStrong,
  },
  chipActive: { backgroundColor: COLORS.gold },
  chipText: { ...TYPE.label, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.ctaText, fontWeight: "800" },
  formButtons: { flexDirection: "row", justifyContent: "flex-end", gap: SPACING.sm },
  ghostBtn: { paddingHorizontal: SPACING.lg, paddingVertical: 10 },
  ghostBtnText: { ...TYPE.label, color: COLORS.textMuted },
  primaryBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 10,
    minWidth: 90,
    alignItems: "center",
  },
  primaryBtnText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
  title: { ...TYPE.section, color: COLORS.cream, flex: 1 },
  badge: { backgroundColor: COLORS.surfaceStrong, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeLive: { backgroundColor: "#E0324C" },
  badgeText: { ...TYPE.overline, color: COLORS.textMuted },
  badgeTextLive: { color: "#fff" },
  label: { ...TYPE.overline, color: COLORS.textFaint, marginTop: SPACING.md, marginBottom: 4 },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  value: { flex: 1, color: COLORS.cream, fontSize: 12, fontFamily: "monospace" },
  link: { ...TYPE.label, color: COLORS.gold },
  hint: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 6 },
  warn: { ...TYPE.caption, color: "rgba(245,158,11,0.85)", marginTop: 6 },
  ready: { ...TYPE.caption, color: "rgba(111,207,151,0.9)", marginTop: SPACING.md },
  actions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  endBtn: { backgroundColor: "rgba(248,113,113,0.15)", borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: 8 },
  endBtnText: { ...TYPE.label, color: "#f87171" },
  deleteBtn: { backgroundColor: COLORS.surfaceStrong, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: 8 },
  deleteBtnText: { ...TYPE.label, color: COLORS.textMuted },
});
