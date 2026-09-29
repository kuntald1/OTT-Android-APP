import { useCallback, useEffect, useState } from "react";
import { fetchMyActiveSubscription } from "@/api/subscriptions";
import { useAuth } from "@/context/AuthContext";

// Tiny in-memory "the subscription just changed" signal. Every screen that
// shows access-dependent state (tabs, header, lock badges) fetches it once
// on mount and stays mounted in the navigator, so without this a new plan
// only showed up after logout/login. SubscriptionPlansScreen calls
// notifySubscriptionChanged() after a verified payment; consumers subscribe
// with onSubscriptionChanged() and simply refetch. Deliberately a plain
// module-level set (not a Context) so it needs no change to the root
// provider tree — same reason this hook is self-contained.
const subscriptionChangeListeners = new Set<() => void>();

export function notifySubscriptionChanged() {
  subscriptionChangeListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // One consumer failing must not stop the others from refreshing.
    }
  });
}

export function onSubscriptionChanged(listener: () => void): () => void {
  subscriptionChangeListeners.add(listener);
  return () => {
    subscriptionChangeListeners.delete(listener);
  };
}

// Self-contained (not a shared Context) so it doesn't require touching
// the app's root provider tree, which lives outside src/ and isn't
// part of this bundle. The small cost is that each screen using this
// hook (AppHeader, MainTabs) makes its own GET /subscriptions/me call
// rather than sharing one — negligible for how rarely this changes.
//
// plan_name is matched case-insensitively against "Play"/"Archive" —
// anything else (including "Both", an unrecognized name, or no active
// subscription at all) defaults to BOTH true. That default matters:
// a logged-out user, a lapsed subscription, or a plan name this app
// doesn't recognize should never accidentally hide navigation the
// person actually needs.
export function useSubscriptionAccess() {
  const { isAuthenticated } = useAuth();
  const [hasPlay, setHasPlay] = useState(true);
  const [hasArchive, setHasArchive] = useState(true);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setHasPlay(true);
      setHasArchive(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sub = await fetchMyActiveSubscription();
      const planName = (sub?.plan_name || "").trim().toLowerCase();
      if (planName === "play") {
        setHasPlay(true);
        setHasArchive(false);
      } else if (planName === "archive") {
        setHasPlay(false);
        setHasArchive(true);
      } else {
        setHasPlay(true);
        setHasArchive(true);
      }
    } catch {
      setHasPlay(true);
      setHasArchive(true);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refetch right after a payment succeeds, so MainTabs / AppHeader (which
  // stay mounted) pick up the new plan without a logout/login.
  useEffect(() => onSubscriptionChanged(refresh), [refresh]);

  return { hasPlay, hasArchive, loading, refresh };
}
