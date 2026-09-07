import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  ProfileSection,
  fetchProfileSections,
  createProfileSection,
  updateProfileSection,
  deleteProfileSection,
} from "@/api/organiserProfile";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";

// Strips HTML tags for editing in a plain TextInput. Existing sections
// (created on the web) can have rich formatting (headings, bold, lists) —
// editing and saving here flattens that to plain paragraphs. Good enough
// for quick text fixes; for anything that needs to keep its original
// formatting, edit it on the web instead.
function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export default function OrganiserAboutSections({ organiserName }: { organiserName: string }) {
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setSections(await fetchProfileSections());
    } catch {
      // Silent — this card is a bonus feature, not core to the profile save flow.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (section: ProfileSection) => {
    setEditingId(section.id);
    setDraftTitle(section.title);
    setDraftContent(htmlToPlainText(section.content_html));
  };

  const startAdd = () => {
    setEditingId("new");
    setDraftTitle("");
    setDraftContent("");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!draftTitle.trim()) {
      Alert.alert("Title required", "Give this section a title.");
      return;
    }
    setSaving(true);
    try {
      const payload = { title: draftTitle.trim(), content_html: plainTextToHtml(draftContent.trim()) };
      if (editingId === "new") {
        const created = await createProfileSection(payload);
        setSections((prev) => [...prev, created]);
      } else if (editingId) {
        const updated = await updateProfileSection(editingId, payload);
        setSections((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
      }
      setEditingId(null);
    } catch {
      Alert.alert("Couldn't save", "Something went wrong saving this section. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (section: ProfileSection) => {
    Alert.alert("Delete section?", `"${section.title}" will be removed from your public profile.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProfileSection(section.id);
            setSections((prev) => prev.filter((s) => s.id !== section.id));
          } catch {
            Alert.alert("Couldn't delete", "Something went wrong. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📖 About {organiserName}</Text>
      <Text style={styles.cardSubtitle}>
        Tell people about your organisation — add sections like About, Early Days, Selected Plays, or Awards.
      </Text>

      {loading ? (
        <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.md }} />
      ) : (
        sections.map((section) =>
          editingId === section.id ? (
            <EditForm
              key={section.id}
              title={draftTitle}
              content={draftContent}
              saving={saving}
              onTitleChange={setDraftTitle}
              onContentChange={setDraftContent}
              onSave={saveEdit}
              onCancel={cancelEdit}
            />
          ) : (
            <View key={section.id} style={styles.sectionRow}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {section.title}
              </Text>
              <View style={styles.sectionActions}>
                <TouchableOpacity onPress={() => startEdit(section)}>
                  <Text style={styles.editLink}>✎ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(section)}>
                  <Text style={styles.deleteLink}>✕ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        )
      )}

      {editingId === "new" ? (
        <EditForm
          title={draftTitle}
          content={draftContent}
          saving={saving}
          onTitleChange={setDraftTitle}
          onContentChange={setDraftContent}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />
      ) : (
        <TouchableOpacity style={styles.addButton} onPress={startAdd}>
          <Text style={styles.addButtonText}>+ Add section</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EditForm({
  title,
  content,
  saving,
  onTitleChange,
  onContentChange,
  onSave,
  onCancel,
}: {
  title: string;
  content: string;
  saving: boolean;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.editForm}>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={onTitleChange}
        placeholder="Section title"
        placeholderTextColor={COLORS.textFaint}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        value={content}
        onChangeText={onContentChange}
        placeholder="Section content"
        placeholderTextColor={COLORS.textFaint}
        multiline
        textAlignVertical="top"
      />
      <View style={styles.editFormActions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={saving}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveSectionButton} onPress={onSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.ctaText} />
          ) : (
            <Text style={styles.saveSectionButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg },
  cardTitle: { ...TYPE.section, color: COLORS.cream },
  cardSubtitle: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.md },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionTitle: { ...TYPE.body, color: COLORS.cream, flex: 1, marginRight: SPACING.sm },
  sectionActions: { flexDirection: "row", gap: SPACING.md },
  editLink: { ...TYPE.caption, color: COLORS.gold },
  deleteLink: { ...TYPE.caption, color: COLORS.burgundyLight },
  addButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
  },
  addButtonText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },
  editForm: { backgroundColor: COLORS.surfaceStrong, borderRadius: RADIUS.sm, padding: SPACING.md, marginBottom: SPACING.sm },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.cream,
    ...TYPE.body,
    marginBottom: SPACING.sm,
  },
  textArea: { minHeight: 100 },
  editFormActions: { flexDirection: "row", justifyContent: "flex-end", gap: SPACING.sm },
  cancelButton: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  cancelButtonText: { ...TYPE.label, color: COLORS.textMuted },
  saveSectionButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    minWidth: 70,
    alignItems: "center",
  },
  saveSectionButtonText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },
});
