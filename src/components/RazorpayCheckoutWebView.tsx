import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { COLORS, SPACING, TYPE } from "@/theme";

export interface RazorpaySuccessResult {
  razorpay_payment_id: string;
  // "" for an auto-renew (subscription) checkout, which has no order.
  razorpay_order_id: string;
  // Only set for an auto-renew (subscription) checkout.
  razorpay_subscription_id?: string;
  razorpay_signature: string;
}

interface Props {
  visible: boolean;
  keyId: string;
  // One-time payment: orderId + amountPaise + currency.
  // Auto-renew (UPI Autopay): subscriptionId instead — the amount and billing
  // cycle live on the Razorpay subscription itself, not in these options.
  orderId?: string;
  amountPaise?: number;
  currency?: string;
  subscriptionId?: string;
  name: string;
  description: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillContact?: string;
  onSuccess: (result: RazorpaySuccessResult) => void;
  onDismiss: () => void;
  onFailure: (error: any) => void;
}

// Loads Razorpay's own hosted checkout.js inside a WebView and opens it
// immediately — same script the web app uses, so it renders Razorpay's
// standard Cards/Netbanking/Wallet UI (confirmed against Healthycian's
// working WebView-based checkout). This sidesteps react-native-razorpay
// entirely, since that native module doesn't build under this app's New
// Architecture setup.
function buildHtml(props: Props): string {
  const payment = props.subscriptionId
    ? { subscription_id: props.subscriptionId }
    : { amount: props.amountPaise, currency: props.currency, order_id: props.orderId };

  const safeOptions = {
    key: props.keyId,
    ...payment,
    name: props.name,
    description: props.description,
    prefill: {
      name: props.prefillName || "",
      email: props.prefillEmail || "",
      contact: props.prefillContact || "",
    },
    theme: { color: "#D4AF37" },
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;background:#ffffff;">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    var options = ${JSON.stringify(safeOptions)};
    options.handler = function (response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        status: "success",
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_subscription_id: response.razorpay_subscription_id,
        razorpay_signature: response.razorpay_signature
      }));
    };
    options.modal = {
      ondismiss: function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ status: "dismissed" }));
      }
    };
    var rzp = new Razorpay(options);
    rzp.on("payment.failed", function (response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ status: "failed", error: response.error }));
    });
    rzp.open();
  </script>
</body>
</html>`;
}

export default function RazorpayCheckoutWebView(props: Props) {
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.status === "success") {
        props.onSuccess({
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_order_id: data.razorpay_order_id || "",
          razorpay_subscription_id: data.razorpay_subscription_id,
          razorpay_signature: data.razorpay_signature,
        });
      } else if (data.status === "dismissed") {
        props.onDismiss();
      } else if (data.status === "failed") {
        props.onFailure(data.error);
      }
    } catch {
      // Ignore malformed/unrelated postMessage payloads.
    }
  };

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onDismiss}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={props.onDismiss}>
          <Text style={styles.closeButtonText}>✕ Close</Text>
        </TouchableOpacity>
        {props.visible && (
          <WebView
            originWhitelist={["*"]}
            source={{ html: buildHtml(props) }}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            style={styles.webview}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  closeButton: {
    padding: SPACING.md,
    backgroundColor: COLORS.burgundyMuted,
  },
  closeButtonText: { ...TYPE.label, color: COLORS.cream },
  webview: { flex: 1 },
});
