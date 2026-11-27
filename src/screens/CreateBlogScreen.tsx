import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { fetchBlogDetail, submitBlog, updateMyBlog, uploadMyBlogCover } from "@/api/community";
import { resolveMediaUrl } from "@/api/apiClient";
import { COLORS } from "@/theme/colors";
import GradientBackground from "@/components/GradientBackground";
import ThemedAlert, { ThemedAlertState } from "@/components/ThemedAlert";

// Writing a post from the app. What a member submits here does NOT go
// live — it joins the admin review queue, and the admins are messaged
// the moment it lands.
//
// The screen says that twice: once above the fields and once after
// sending. Somebody who expects to see their words on the site within
// the minute and doesn't would reasonably conclude it failed.
const MAX_EXCERPT = 500;
const MAX_COVER_MB = 5;

export default function CreateBlogScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  // Passed when editing one of your own drafts; absent when writing a
  // new post. Only a post that is NOT yet published can be edited, and
  // the server enforces that too — this screen only decides what to show.
  const existing = route.params?.post || null;
  const editing = !!existing;

  const [title, setTitle] = useState(existing?.title || "");
  const [excerpt, setExcerpt] = useState(existing?.excerpt || "");
  const [body, setBody] = useState("");
  // The list this screen opens from carries no body, so fetch it. The
  // box stays disabled until it arrives rather than showing an empty
  // field somebody might type into and overwrite their draft with.
  const [loadingBody, setLoadingBody] = useState(editing);
  const [coverUri, setCoverUri] = useState<string | null>(
    existing?.cover_image_url ? resolveMediaUrl(existing.cover_image_url) ?? null : null
  );
  const [coverPicked, setCoverPicked] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [alert, setAlert] = useState<ThemedAlertState>(null);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    fetchBlogDetail(existing.id)
      .then((full) => {
        if (!cancelled) setBody(full.body || "");
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your draft. Go back and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoadingBody(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editing, existing?.id]);

  const canSubmit =
    !!title.trim() && !!excerpt.trim() && !!body.trim() && !saving && !loadingBody;

  const handlePickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAlert({
        title: "Permission needed",
        body: "Allow photo library access to choose a cover image.",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      // Roughly the shape the cover is shown at on the site and in the
      // app list, so what they crop is what they get.
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_COVER_MB * 1024 * 1024) {
      setAlert({ title: "Image too large", body: `Please choose an image under ${MAX_COVER_MB}MB.` });
      return;
    }
    // The server only accepts JPEG, PNG and WEBP and decides the stored
    // name from the type it validates, so send a real one rather than
    // whatever the library guessed from the file name.
    const type = asset.mimeType && asset.mimeType.startsWith("image/") ? asset.mimeType : "image/jpeg";
    setError("");
    setCoverUri(asset.uri);
    setCoverPicked({ uri: asset.uri, name: asset.fileName || "cover.jpg", type });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const fields = { title: title.trim(), excerpt: excerpt.trim(), body: body.trim() };
      const saved = editing ? await updateMyBlog(existing.id, fields) : await submitBlog(fields);
      // Cover second: it needs the post's id, and a failed image must
      // not lose the writing. If this throws the post is already saved,
      // and the message says exactly that.
      if (coverPicked) {
        try {
          await uploadMyBlogCover(saved.id, coverPicked);
        } catch {
          setError("Your post was sent, but the cover image didn't upload. You can add it by editing the post.");
        }
      }
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Couldn't send your post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <GradientBackground style={styles.screen}>
        <View style={styles.doneWrap}>
          <Text style={styles.doneTitle}>Sent for review</Text>
          <Text style={styles.doneBody}>
            Thank you — your post has gone to the theomy editors. They have been notified and will
            publish it or write back with what needs changing. You'll get a WhatsApp and an email
            either way.
          </Text>
          <Text style={styles.doneBody}>
            Until then it sits under <Text style={styles.bold}>Your posts</Text> on the Blog
            section, where you can read it back and keep editing it.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            {editing
              ? "You can keep changing this until an editor publishes it. Saving a post that was turned down sends it back for review."
              : "An editor reads every post before it goes on the site. Yours will appear once it's approved — we'll message you either way."}
          </Text>

          {/* Cover first: it is the field people forget exists if it
              sits under a long body box. */}
          <Text style={styles.label}>COVER IMAGE</Text>
          <View style={styles.coverRow}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverPreview} />
            ) : (
              <View style={[styles.coverPreview, styles.coverEmpty]}>
                <Text style={styles.coverEmptyText}>No cover</Text>
              </View>
            )}
            <View style={styles.coverActions}>
              <TouchableOpacity style={styles.coverButton} onPress={handlePickCover}>
                <Text style={styles.coverButtonText}>
                  {coverUri ? "Change cover image" : "Add cover image"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.coverHint}>Optional · up to {MAX_COVER_MB}MB</Text>
            </View>
          </View>

          <Text style={styles.label}>TITLE</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            maxLength={255}
            placeholder="What is the post about?"
            placeholderTextColor="rgba(245,235,221,0.35)"
          />

          <Text style={styles.label}>SHORT SUMMARY</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={excerpt}
            onChangeText={setExcerpt}
            maxLength={MAX_EXCERPT}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholder="One or two sentences — this is what people see in the list."
            placeholderTextColor="rgba(245,235,221,0.35)"
          />
          <Text style={styles.counter}>{excerpt.length}/{MAX_EXCERPT}</Text>

          <Text style={styles.label}>THE POST</Text>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            value={body}
            onChangeText={setBody}
            multiline
            editable={!loadingBody}
            numberOfLines={12}
            textAlignVertical="top"
            placeholder={loadingBody ? "Loading your draft…" : "Write it here. Leave a blank line between paragraphs."}
            placeholderTextColor="rgba(245,235,221,0.35)"
          />

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.ctaText} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {editing ? "Save and send for review" : "Send for review"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <ThemedAlert alert={alert} onClose={() => setAlert(null)} />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  intro: { color: COLORS.cream, opacity: 0.7, fontSize: 13, lineHeight: 19, marginBottom: 20 },
  label: {
    color: COLORS.cream,
    opacity: 0.5,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(245,235,221,0.15)",
    backgroundColor: "rgba(245,235,221,0.05)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: COLORS.cream,
    fontSize: 14,
  },
  multiline: { minHeight: 76 },
  coverRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  coverPreview: {
    width: 128,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  coverEmpty: { alignItems: "center", justifyContent: "center", borderStyle: "dashed" },
  coverEmptyText: { color: COLORS.cream, opacity: 0.35, fontSize: 11 },
  coverActions: { flex: 1 },
  coverButton: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  coverButtonText: { color: COLORS.gold, fontSize: 13, fontWeight: "600" },
  coverHint: { color: COLORS.cream, opacity: 0.35, fontSize: 11, marginTop: 6, textAlign: "center" },
  bodyInput: { minHeight: 240, lineHeight: 21 },
  counter: {
    color: COLORS.cream,
    opacity: 0.35,
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  errorBox: {
    marginTop: 18,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(248,113,113,0.12)",
  },
  errorText: { color: "#f87171", fontSize: 13 },
  primaryButton: {
    marginTop: 24,
    backgroundColor: COLORS.gold,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: { color: COLORS.ctaText, fontSize: 15, fontWeight: "700" },
  doneWrap: { flex: 1, justifyContent: "center", padding: 24 },
  doneTitle: { color: COLORS.cream, fontSize: 22, fontWeight: "700", marginBottom: 14 },
  doneBody: { color: COLORS.cream, opacity: 0.7, fontSize: 14, lineHeight: 21, marginBottom: 12 },
  bold: { fontWeight: "700", opacity: 1 },
});
