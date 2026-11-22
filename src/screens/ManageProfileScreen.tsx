import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/context/AuthContext";
import { updateProfile, uploadProfilePhoto, changePassword } from "@/api/auth";
import { resolveMediaUrl } from "@/api/apiClient";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";
import AutoRenewCard from "@/components/AutoRenewCard";
import OrganiserAboutSections from "@/components/OrganiserAboutSections";
import FamilyAccountsCard from "@/components/FamilyAccountsCard";
import FamilyPinSection from "@/components/FamilyPinSection";

export default function ManageProfileScreen() {
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  // Family PIN is the LAST thing on this screen, so when its form opens
  // the keyboard sits right on top of it. scrollToEnd after the keyboard
  // has had a moment to appear brings it back into view; the
  // KeyboardAvoidingView below is what makes that room exist at all.
  const scrollRef = useRef<ScrollView>(null);
  const familyCardY = useRef(0);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const photoUrl = resolveMediaUrl(user?.profile_photo_url);

  const onChangePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to change your profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingPhoto(true);
    try {
      const updated = await uploadProfilePhoto(result.assets[0].uri);
      updateUser(updated);
    } catch {
      Alert.alert("Upload failed", "Couldn't update your profile photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onSaveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert("Missing info", "Name and email are required.");
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      updateUser(updated);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch {
      Alert.alert("Couldn't save", "Something went wrong updating your profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert("Password too short", "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords don't match", "New password and confirm password must match.");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Password changed", "Your password has been updated.");
    } catch {
      Alert.alert("Couldn't change password", "Check your current password and try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <GradientBackground style={styles.screen}>
      {/* behavior="padding" on BOTH platforms, not just iOS: this app runs
          edge-to-edge, where Android's own adjustResize never fires, so
          without this the keyboard simply covers whatever is at the
          bottom of the page. Same fix as RegisterScreen. The navigation
          header is accounted for automatically — KeyboardAvoidingView
          measures its own frame, which starts below the header. */}
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: SPACING.xxl + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{name?.[0]?.toUpperCase() || "?"}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.changePhotoButton} onPress={onChangePhoto} disabled={uploadingPhoto}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={COLORS.ctaText} />
              ) : (
                <Text style={styles.changePhotoText}>Change photo</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>NAME</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={COLORS.textFaint} />

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={COLORS.textFaint}
          />

          <Text style={styles.label}>PHONE (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.textFaint}
          />

          <TouchableOpacity style={styles.saveButton} onPress={onSaveProfile} disabled={savingProfile}>
            {savingProfile ? (
              <ActivityIndicator size="small" color={COLORS.ctaText} />
            ) : (
              <Text style={styles.saveButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔒 Change Password</Text>

          <Text style={styles.label}>OLD PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry
            placeholderTextColor={COLORS.textFaint}
          />

          <Text style={styles.label}>NEW PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Min. 8 characters"
            placeholderTextColor={COLORS.textFaint}
          />

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholderTextColor={COLORS.textFaint}
          />

          <TouchableOpacity
            style={styles.passwordButton}
            onPress={onChangePassword}
            disabled={changingPassword}
          >
            {changingPassword ? (
              <ActivityIndicator size="small" color={COLORS.cream} />
            ) : (
              <Text style={styles.passwordButtonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Renders nothing unless a mandate is actually running. A
            sub-account doesn't hold the plan, so there is nothing for it
            to cancel — the parent holds the mandate. */}
        {!user?.parent_id && <AutoRenewCard />}

        {user?.role === "plays_organiser" && <OrganiserAboutSections organiserName={user.name} />}

        <View onLayout={(e) => { familyCardY.current = e.nativeEvent.layout.y; }}>
          <FamilyAccountsCard
            onFormFocus={(formY) => {
              // Put the top of the add form at the top of the visible area
              // so name, email and password all sit above the keyboard.
              setTimeout(
                () => scrollRef.current?.scrollTo({ y: Math.max(0, familyCardY.current + formY - 8), animated: true }),
                300
              );
            }}
          />
        </View>
        <FamilyPinSection
          onStartEditing={() => {
            // The delay lets the keyboard finish animating in, otherwise
            // we scroll to an end that is about to move.
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
          }}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  cardTitle: { ...TYPE.section, color: COLORS.cream, marginBottom: SPACING.md },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginBottom: SPACING.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.burgundyDark },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitial: { ...TYPE.title, color: COLORS.gold },
  changePhotoButton: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    minWidth: 120,
    alignItems: "center",
  },
  changePhotoText: { ...TYPE.label, color: COLORS.gold },
  label: { ...TYPE.overline, color: COLORS.textMuted, marginTop: SPACING.md, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.cream,
    ...TYPE.body,
  },
  saveButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    marginTop: SPACING.lg,
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.xl,
  },
  saveButtonText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },
  passwordButton: {
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    marginTop: SPACING.lg,
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.xl,
  },
  passwordButtonText: { ...TYPE.label, color: COLORS.cream, fontWeight: "700" },
});
