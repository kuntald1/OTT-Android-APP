import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/context/AuthContext";
import { updateProfile, uploadProfilePhoto, changePassword } from "@/api/auth";
import { resolveMediaUrl } from "@/api/apiClient";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";
import OrganiserAboutSections from "@/components/OrganiserAboutSections";
import FamilyAccountsCard from "@/components/FamilyAccountsCard";
import FamilyPinSection from "@/components/FamilyPinSection";

export default function ManageProfileScreen() {
  const { user, updateUser } = useAuth();
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        {user?.role === "plays_organiser" && <OrganiserAboutSections organiserName={user.name} />}

        <FamilyAccountsCard />
        <FamilyPinSection />
      </ScrollView>
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
