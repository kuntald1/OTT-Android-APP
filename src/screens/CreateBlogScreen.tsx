import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { submitBlog } from "@/api/community";
import { COLORS } from "@/theme/colors";
import GradientBackground from "@/components/GradientBackground";

// Writing a post from the app. What a member submits here does NOT go
// live — it joins the admin review queue, and the admins are messaged
// the moment it lands.
//
// The screen says that twice: once above the fields and once after
// sending. Somebody who expects to see their words on the site within
// the minute and doesn't would reasonably conclude it failed.
const MAX_EXCERPT = 500;

export default function CreateBlogScreen() {
  const navigation = useNavigation<any>();
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const canSubmit = !!title.trim() && !!excerpt.trim() && !!body.trim() && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await submitBlog({ title: title.trim(), excerpt: excerpt.trim(), body: body.trim() });
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
            section, where you can read it back.
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
            An editor reads every post before it goes on the site. Yours will appear once it's
            approved — we'll message you either way.
          </Text>

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
            numberOfLines={12}
            textAlignVertical="top"
            placeholder="Write it here. Leave a blank line between paragraphs."
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
              <Text style={styles.primaryButtonText}>Send for review</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
