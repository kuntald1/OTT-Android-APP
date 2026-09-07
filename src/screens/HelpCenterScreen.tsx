import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { createTicket, fetchMyTickets, SupportTicket } from "@/api/tickets";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";

const SUPPORT_PHONE = "+91 33 4000 1234";
const SUPPORT_HOURS = "Mon–Sat, 10:00 AM – 7:00 PM IST";

type Tab = "message" | "call" | "complaint";

const STATUS_COLORS: Record<string, string> = {
  Open: COLORS.gold,
  "In Progress": "#5AA9E6",
  Closed: COLORS.textFaint,
};

export default function HelpCenterScreen() {
  const [tab, setTab] = useState<Tab>("message");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const [message, setMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [complaintSubject, setComplaintSubject] = useState("");
  const [complaintDetails, setComplaintDetails] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [lastTicket, setLastTicket] = useState<SupportTicket | null>(null);

  const [ticketsError, setTicketsError] = useState<string | null>(null);

  const loadTickets = async () => {
    try {
      setTickets(await fetchMyTickets());
      setTicketsError(null);
    } catch (err: any) {
      // Surface the real cause instead of silently leaving the list empty
      // (which was rendering as "no tickets" even when tickets existed).
      setTicketsError(
        err?.response
          ? `Failed to load (HTTP ${err.response.status}): ${JSON.stringify(err.response.data)}`
          : err?.message || "Unknown network error"
      );
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const onSendMessage = async () => {
    if (!message.trim()) return;
    setSendingMessage(true);
    try {
      const created = await createTicket({
        subject: "General Message",
        description: message.trim(),
        source: "message",
      });
      setTickets((prev) => [created, ...prev]);
      setMessage("");
    } catch (err: any) {
      const detail = err?.response
        ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : err?.message || "Unknown network error";
      Alert.alert("Couldn't send", detail);
    } finally {
      setSendingMessage(false);
    }
  };

  const onSubmitComplaint = async () => {
    if (!complaintSubject.trim() || !complaintDetails.trim()) {
      Alert.alert("Missing info", "Please fill in both subject and details.");
      return;
    }
    setSubmittingComplaint(true);
    try {
      const created = await createTicket({
        subject: complaintSubject.trim(),
        description: complaintDetails.trim(),
        source: "complaint",
      });
      setTickets((prev) => [created, ...prev]);
      setLastTicket(created);
      setComplaintSubject("");
      setComplaintDetails("");
    } catch (err: any) {
      const detail = err?.response
        ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : err?.message || "Unknown network error";
      Alert.alert("Couldn't submit", detail);
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const onCallNow = () => Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`);

  return (
    <GradientBackground style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Help Center</Text>
        <Text style={styles.subtitle}>
          Send a message, call us, or raise a complaint — we'll track it with a ticket number.
        </Text>

        <View style={styles.tabRow}>
          {(["message", "call", "complaint"] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === "message" ? "💬 Message" : t === "call" ? "📞 Call" : "📄 Complain"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "message" && (
          <View style={styles.card}>
            <Text style={styles.label}>YOUR MESSAGE</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="How can we help?"
              placeholderTextColor={COLORS.textFaint}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.actionButton} onPress={onSendMessage} disabled={sendingMessage}>
              {sendingMessage ? (
                <ActivityIndicator size="small" color={COLORS.ctaText} />
              ) : (
                <Text style={styles.actionButtonText}>Send message</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {tab === "call" && (
          <View style={[styles.card, styles.callCard]}>
            <View style={styles.callIcon}>
              <Text style={{ fontSize: 22 }}>📞</Text>
            </View>
            <Text style={styles.phoneNumber}>{SUPPORT_PHONE}</Text>
            <Text style={styles.hours}>{SUPPORT_HOURS}</Text>
            <TouchableOpacity style={styles.actionButton} onPress={onCallNow}>
              <Text style={styles.actionButtonText}>Call Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === "complaint" && (
          <View style={styles.card}>
            {lastTicket && (
              <View style={styles.confirmBanner}>
                <Text style={styles.confirmTitle}>Ticket {lastTicket.ticket_number} created</Text>
                <Text style={styles.confirmSubtitle}>We'll update the status here as it's handled.</Text>
              </View>
            )}
            <Text style={styles.label}>SUBJECT</Text>
            <TextInput
              style={styles.input}
              value={complaintSubject}
              onChangeText={setComplaintSubject}
              placeholder="Brief summary"
              placeholderTextColor={COLORS.textFaint}
            />
            <Text style={styles.label}>DETAILS</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={complaintDetails}
              onChangeText={setComplaintDetails}
              placeholder="Describe the issue"
              placeholderTextColor={COLORS.textFaint}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSubmitComplaint}
              disabled={submittingComplaint}
            >
              {submittingComplaint ? (
                <ActivityIndicator size="small" color={COLORS.ctaText} />
              ) : (
                <Text style={styles.actionButtonText}>Submit complaint</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.ticketsHeading}>Your tickets</Text>
        {loadingTickets ? (
          <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.md }} />
        ) : ticketsError ? (
          <Text style={styles.ticketsErrorText}>{ticketsError}</Text>
        ) : tickets.length === 0 ? (
          <Text style={styles.subtitle}>No tickets yet.</Text>
        ) : (
          tickets.map((ticket) => (
            <View key={ticket.id} style={styles.ticketRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ticketNumber}>{ticket.ticket_number}</Text>
                <Text style={styles.ticketSubject} numberOfLines={1}>
                  {ticket.subject}
                </Text>
                <Text style={styles.ticketDescription} numberOfLines={1}>
                  {ticket.description}
                </Text>
                <Text style={styles.ticketDate}>
                  Filed {new Date(ticket.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { borderColor: STATUS_COLORS[ticket.status] || COLORS.textFaint },
                ]}
              >
                <Text style={[styles.statusText, { color: STATUS_COLORS[ticket.status] || COLORS.textFaint }]}>
                  {ticket.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: { ...TYPE.display, color: COLORS.cream },
  subtitle: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.lg },
  tabRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tab: { flex: 1, paddingVertical: SPACING.sm, alignItems: "center", borderRadius: RADIUS.pill },
  tabActive: { backgroundColor: COLORS.gold },
  tabText: { ...TYPE.label, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.ctaText, fontWeight: "800" },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.xl },
  callCard: { alignItems: "center" },
  callIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  phoneNumber: { ...TYPE.title, color: COLORS.cream },
  hours: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.lg },
  label: { ...TYPE.overline, color: COLORS.textMuted, marginTop: SPACING.md, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.cream,
    ...TYPE.body,
  },
  textArea: { minHeight: 100 },
  actionButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.lg,
    width: "100%",
  },
  actionButtonText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800", fontSize: 15 },
  confirmBanner: {
    backgroundColor: "rgba(212,175,55,0.12)",
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  confirmTitle: { ...TYPE.label, color: COLORS.gold, fontWeight: "800" },
  confirmSubtitle: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  ticketsHeading: { ...TYPE.section, color: COLORS.cream, marginBottom: SPACING.md },
  ticketsErrorText: { ...TYPE.caption, color: COLORS.burgundyLight },
  ticketRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: "flex-start",
  },
  ticketNumber: { ...TYPE.label, color: COLORS.gold, fontWeight: "800" },
  ticketSubject: { ...TYPE.body, color: COLORS.cream, marginTop: 2, fontWeight: "700" },
  ticketDescription: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  ticketDate: { ...TYPE.caption, color: COLORS.textFaint, marginTop: 4 },
  statusBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginLeft: SPACING.sm,
  },
  statusText: { ...TYPE.overline, fontSize: 9 },
});
