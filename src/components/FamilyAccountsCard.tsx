import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SubAccount, fetchMySubAccounts, createSubAccount, deactivateSubAccount } from "@/api/subAccounts";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";

export default function FamilyAccountsCard() {
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [maxAllowed, setMaxAllowed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setSaving(true);
    try {
      const created = await createSubAccount({ name: name.trim(), email: email.trim(), password });
      setSubAccounts((prev) => [...prev, created]);
      setAdding(false);
      setName("");
      setEmail("");
      setPassword("");
    } catch {
      Alert.alert("Couldn't add account", "Something went wrong creating this account. Please try again.");
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
          <View style={styles.addFormActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setAdding(false)}
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
