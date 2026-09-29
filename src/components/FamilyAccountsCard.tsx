import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SubAccount, fetchMySubAccounts, createSubAccount, deactivateSubAccount } from "@/api/subAccounts";
import { extractErrorMessage } from "@/api/apiClient";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";

export default function FamilyAccountsCard() {
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [maxAllowed, setMaxAllowed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // The parent's declaration, required before a sub-account can be created
  // (backend rejects the request without it) — null means "not yet
  // chosen". See SubAccount's is_minor docstring: an adult-declared
  // sub-account fills in its own date of birth/city on its own first
  // login; a minor never does, and this can't be changed later.
  const [isMinor, setIsMinor] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { max_allowed, sub_accounts } = await fetchMySubAccounts();
      setMaxAllowed(max_allowed);
      setSubAccounts(sub_accounts);
    } catch {
      // Silent — this card is a bonus feature, not core to the profile save flow.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onAdd = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) {
      Alert.alert("Missing info", "Name, email, and a password of at least 8 characters are required.");
      return;
    }
    if (isMinor === null) {
      Alert.alert("One more thing", "Please say whether this account is for someone under 18.");
      return;
    }
    setSaving(true);
    try {
      const created = await createSubAccount({ name: name.trim(), email: email.trim(), password, isMinor });
      setSubAccounts((prev) => [...prev, created]);
      setAdding(false);
      setName("");
      setEmail("");
      setPassword("");
      setIsMinor(null);
    } catch (e: any) {
      Alert.alert("Couldn't add account", extractErrorMessage(e, "Something went wrong creating this account. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const onDeactivate = (account: SubAccount) => {
    Alert.alert("Deactivate account?", `${account.name} will lose access.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Deactivate",
        style: "destructive",
        onPress: async () => {
          try {
            const updated = await deactivateSubAccount(account.id);
            setSubAccounts((prev) => prev.map((a) => (a.id === account.id ? updated : a)));
          } catch {
            Alert.alert("Couldn't deactivate", "Something went wrong. Please try again.");
          }
        },
      },
    ]);
  };

  const activeCount = subAccounts.filter((a) => a.is_active).length;
  const canAddMore = activeCount < maxAllowed;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>👥 Family Accounts</Text>
      <Text style={styles.cardSubtitle}>
        {activeCount} of {maxAllowed} additional accounts created — shares your plan's extra screens.
      </Text>

      {loading ? (
        <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.md }} />
      ) : (
        subAccounts.map((account) => (
          <View key={account.id} style={styles.accountRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.accountNameRow}>
                <Text style={styles.accountName}>{account.name}</Text>
                {!account.is_active && <Text style={styles.deactivatedTag}>DEACTIVATED</Text>}
                {account.is_active && (
                  <Text style={account.is_minor ? styles.minorTag : styles.adultTag}>
                    {account.is_minor ? "MINOR" : "ADULT"}
                  </Text>
                )}
              </View>
              <Text style={styles.accountEmail}>{account.email}</Text>
            </View>
            {account.is_active && (
              <TouchableOpacity onPress={() => onDeactivate(account)}>
                <Text style={styles.deactivateLink}>Deactivate</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}

      {adding ? (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={COLORS.textFaint}
          />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={COLORS.textFaint}
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password (min. 8 characters)"
            secureTextEntry
            placeholderTextColor={COLORS.textFaint}
          />

          <Text style={styles.questionLabel}>Is this account for someone under 18?</Text>
          <View style={styles.minorToggleRow}>
            <TouchableOpacity
              style={[styles.minorOption, isMinor === true && styles.minorOptionActive]}
              onPress={() => setIsMinor(true)}
            >
              <Text style={[styles.minorOptionText, isMinor === true && styles.minorOptionTextActive]}>
                Yes, under 18
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.minorOption, isMinor === false && styles.minorOptionActive]}
              onPress={() => setIsMinor(false)}
            >
              <Text style={[styles.minorOptionText, isMinor === false && styles.minorOptionTextActive]}>
                No, 18 or older
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.minorHelperText}>
            {isMinor === true
              ? "This account will never be asked for date of birth or city."
              : isMinor === false
              ? "This account will be asked to add its own date of birth and city the first time it logs in."
              : "This can't be changed later, so please choose carefully."}
          </Text>

          <View style={styles.addFormActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => { setAdding(false); setIsMinor(null); }}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveAccountButton} onPress={onAdd} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.ctaText} />
              ) : (
                <Text style={styles.saveAccountButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        canAddMore && (
          <TouchableOpacity style={styles.addButton} onPress={() => setAdding(true)}>
            <Text style={styles.addButtonText}>+ Add account</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg },
  cardTitle: { ...TYPE.section, color: COLORS.cream },
  cardSubtitle: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.md },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  accountNameRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  accountName: { ...TYPE.body, color: COLORS.cream, fontWeight: "700" },
  deactivatedTag: { ...TYPE.overline, color: COLORS.textFaint },
  minorTag: { ...TYPE.overline, color: COLORS.textMuted },
  adultTag: { ...TYPE.overline, color: COLORS.gold },
  accountEmail: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  deactivateLink: { ...TYPE.caption, color: COLORS.burgundyLight },
  addButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
  },
  addButtonText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },
  addForm: { backgroundColor: COLORS.surfaceStrong, borderRadius: RADIUS.sm, padding: SPACING.md },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.cream,
    ...TYPE.body,
    marginBottom: SPACING.sm,
  },
  addFormActions: { flexDirection: "row", justifyContent: "flex-end", gap: SPACING.sm },
  cancelButton: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  cancelButtonText: { ...TYPE.label, color: COLORS.textMuted },
  questionLabel: { ...TYPE.caption, color: COLORS.textMuted, marginBottom: SPACING.xs },
  minorToggleRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.xs },
  minorOption: {
    flex: 1,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  minorOptionActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  minorOptionText: { ...TYPE.caption, color: COLORS.textMuted, fontWeight: "700" },
  minorOptionTextActive: { color: COLORS.ctaText },
  minorHelperText: { ...TYPE.caption, color: COLORS.textFaint, marginBottom: SPACING.md },
  saveAccountButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    minWidth: 70,
    alignItems: "center",
  },
  saveAccountButtonText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },
});
