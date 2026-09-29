import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { FamilyAccount, fetchFamilyAccounts, setFamilyPin, switchFamilyAccount } from "@/api/family";
import { extractErrorMessage } from "@/api/apiClient";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import PinField, { isCompletePin } from "./PinField";

// ---------------------------------------------------------------------------
// "Who's watching?" — full-screen account picker for a family (a main
// account plus the sub-accounts it created). Opens by itself right after a
// real login when the account has a family (see AuthContext's
// openFamilyPickerIfFamily), and from "Switch account" in the profile menu.
// Mirrors the web app's shared/WhosWatching.jsx exactly, against the same
// backend (routers/family.py):
//   * main account -> one of its family members: one tap, no PIN.
//   * family member -> back into the main account: needs the Family PIN.
//   * before the FIRST family member is entered, the main account must
//     have a PIN (otherwise there'd be no safe way back), so it's asked
//     for first.
// ---------------------------------------------------------------------------

type Dialog = { mode: "enter" | "create"; account: FamilyAccount } | null;

export default function WhosWatching() {
  const { isAuthenticated, familyPickerOpen, closeFamilyPicker, applyAccountSwitch } = useAuth();
  const insets = useSafeAreaInsets();
  const open = familyPickerOpen && isAuthenticated;

  const [data, setData] = useState<{ accounts: FamilyAccount[]; pin_set: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setDialog(null);
    setNotice("");
    fetchFamilyAccounts()
      .then((r) => { if (!cancelled) setData(r); })
      .catch((e) => { if (!cancelled) setLoadError(extractErrorMessage(e, "Couldn't load your accounts.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  if (!open) return null;

  // Resolves to an error message (shown inside the dialog) or null on success.
  const switchTo = async (account: FamilyAccount, pin: string | null): Promise<string | null> => {
    try {
      const res = await switchFamilyAccount(account.id, pin || undefined);
      applyAccountSwitch(res); // also closes this picker
      return null;
    } catch (e: any) {
      return extractErrorMessage(e, "Couldn't switch accounts. Please try again.");
    }
  };

  const pick = async (account: FamilyAccount) => {
    setNotice("");
    if (account.is_current) {
      closeFamilyPicker();
      return;
    }
    if (account.requires_pin) {
      if (!data?.pin_set) {
        setNotice(`${account.name} hasn't set a Family PIN yet. Ask them to set one in Manage Profile, then try again.`);
        return;
      }
      setDialog({ mode: "enter", account });
      return;
    }
    if (!data?.pin_set) {
      setDialog({ mode: "create", account });
      return;
    }
    const message = await switchTo(account, null);
    if (message) setNotice(message);
  };

  const submitPin = async (pin: string): Promise<string | null> => {
    if (!dialog) return null;
    if (dialog.mode === "create") {
      try {
        await setFamilyPin({ newPin: pin });
      } catch (e: any) {
        return extractErrorMessage(e, "Couldn't save the PIN. Please try again.");
      }
      setData((d) => (d ? { ...d, pin_set: true } : d));
      return switchTo(dialog.account, null);
    }
    return switchTo(dialog.account, pin);
  };

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={() => {}}>
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          onPress={closeFamilyPicker}
          accessibilityLabel="Close"
          style={[styles.closeButton, { top: insets.top + 12 }]}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Who's watching?</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.xl }} />
        ) : loadError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity onPress={closeFamilyPicker} style={styles.continueButton}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.tilesRow}>
              {data?.accounts.map((account) => (
                <AccountTile
                  key={account.id}
                  account={account}
                  pinMissing={account.requires_pin && !data.pin_set}
                  onPress={() => pick(account)}
                />
              ))}
            </View>
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          </>
        )}

        {dialog && (
          <PinDialog
            mode={dialog.mode}
            account={dialog.account}
            onCancel={() => setDialog(null)}
            onSubmit={submitPin}
          />
        )}
      </View>
    </Modal>
  );
}

function AccountTile({
  account,
  pinMissing,
  onPress,
}: {
  account: FamilyAccount;
  pinMissing: boolean;
  onPress: () => void;
}) {
  const initial = (account.name || "?")[0].toUpperCase();
  const caption = account.is_current ? "Current" : account.is_parent ? "Main account" : "Family member";
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={`${account.name}${account.requires_pin ? " (PIN required)" : ""}`}
      style={[styles.tile, { opacity: pinMissing ? 0.55 : 1 }]}
    >
      <View style={[styles.avatarBox, account.is_current && styles.avatarBoxCurrent]}>
        {account.photo_url ? (
          <Image source={{ uri: account.photo_url }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarInitial}>{initial}</Text>
        )}
        {account.requires_pin && (
          <View style={styles.lockBadge}>
            <Text style={styles.lockBadgeText}>🔒</Text>
          </View>
        )}
      </View>
      <Text style={styles.tileName} numberOfLines={1}>{account.name}</Text>
      <Text style={styles.tileCaption}>{pinMissing ? "PIN not set" : caption}</Text>
    </TouchableOpacity>
  );
}

// mode "enter":  ask for the Family PIN to get into the main account.
// mode "create": the main account has no PIN yet — set one before entering
//                a family member, so there is always a protected way back.
function PinDialog({
  mode,
  account,
  onCancel,
  onSubmit,
}: {
  mode: "enter" | "create";
  account: FamilyAccount;
  onCancel: () => void;
  onSubmit: (pin: string) => Promise<string | null>;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const creating = mode === "create";

  const submit = async () => {
    if (busy) return;
    if (!isCompletePin(pin)) {
      setError(creating ? "Choose a 4-digit PIN." : "Enter the 4-digit PIN.");
      return;
    }
    if (creating && pin !== confirm) {
      setError("The two PINs don't match.");
      return;
    }
    setError("");
    setBusy(true);
    const message = await onSubmit(pin);
    setBusy(false);
    if (message) {
      setError(message);
      setPin("");
      setConfirm("");
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>
            {creating ? "Set a Family PIN first" : `Enter PIN for ${account.name}`}
          </Text>
          <Text style={styles.dialogSubtitle}>
            {creating
              ? "You'll need this PIN to come back to your own account from a family account."
              : "Enter the 4-digit Family PIN to open this account."}
          </Text>

          <View style={styles.dialogField}>
            <PinField value={pin} onChange={setPin} onEnter={submit} autoFocus disabled={busy} accessibilityLabel={creating ? "New PIN" : "Family PIN"} />
          </View>
          {creating && (
            <View style={styles.dialogField}>
              <PinField value={confirm} onChange={setConfirm} onEnter={submit} disabled={busy} accessibilityLabel="Confirm PIN" placeholder="Confirm" />
            </View>
          )}

          {error ? <Text style={styles.dialogError}>{error}</Text> : null}

          <View style={styles.dialogActions}>
            <TouchableOpacity onPress={onCancel} disabled={busy} style={styles.dialogCancelButton}>
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} disabled={busy} style={styles.dialogSubmitButton}>
              {busy ? (
                <ActivityIndicator size="small" color={COLORS.ctaText} />
              ) : (
                <Text style={styles.dialogSubmitText}>{creating ? "Save & continue" : "Continue"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const TILE_SIZE = 120;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", paddingHorizontal: SPACING.lg },
  closeButton: {
    position: "absolute",
    right: SPACING.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(245,235,221,0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  closeButtonText: { color: "rgba(245,235,221,0.7)", fontSize: 16 },
  heading: { ...TYPE.title, fontSize: 28, color: COLORS.cream, marginTop: SPACING.xxl, marginBottom: SPACING.xl, textAlign: "center" },
  tilesRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: SPACING.lg },
  tile: { width: TILE_SIZE + 10, alignItems: "center", gap: 6 },
  avatarBox: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(245,235,221,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  avatarBoxCurrent: { borderWidth: 3, borderColor: COLORS.gold },
  avatarImage: { width: "100%", height: "100%", borderRadius: RADIUS.md },
  avatarInitial: { fontSize: 42, fontWeight: "700", color: COLORS.cream },
  lockBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockBadgeText: { fontSize: 12 },
  tileName: { ...TYPE.label, color: COLORS.cream, maxWidth: TILE_SIZE + 10 },
  tileCaption: { fontSize: 11, color: COLORS.textMuted },
  center: { alignItems: "center", gap: SPACING.md, marginTop: SPACING.xl },
  errorText: { color: "#f87171", fontSize: 13, textAlign: "center" },
  notice: { marginTop: SPACING.xl, maxWidth: 340, textAlign: "center", color: COLORS.gold, fontSize: 13 },
  continueButton: { backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm },
  continueButtonText: { color: COLORS.ctaText, fontWeight: "700" },
  dialogBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", paddingHorizontal: SPACING.lg },
  dialogCard: { width: "100%", maxWidth: 380, backgroundColor: COLORS.burgundy, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: "rgba(212,175,55,0.25)" },
  dialogTitle: { ...TYPE.section, color: COLORS.cream, marginBottom: 4 },
  dialogSubtitle: { ...TYPE.caption, color: COLORS.textMuted, marginBottom: SPACING.lg },
  dialogField: { marginBottom: SPACING.sm },
  dialogError: { color: "#f87171", fontSize: 12, fontWeight: "600", textAlign: "center", marginBottom: SPACING.sm },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: SPACING.sm, marginTop: SPACING.sm },
  dialogCancelButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  dialogCancelText: { color: COLORS.textMuted, fontSize: 14 },
  dialogSubmitButton: { backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, minWidth: 100, alignItems: "center" },
  dialogSubmitText: { color: COLORS.ctaText, fontWeight: "700", fontSize: 14 },
});
