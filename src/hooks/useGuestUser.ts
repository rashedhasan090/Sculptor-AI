import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook that manages guest user identity.
 *
 * On first render (when the browser has the "sculptor-guest" localStorage flag
 * but no guest user ID yet), it calls the `getOrCreateGuestUser` Convex
 * mutation to create a permanent guest user document in the DB. The returned
 * ID is stored in localStorage so it persists across refreshes.
 *
 * Returns `{ guestUserId, isGuest }`.
 */
export function useGuestUser() {
  const isGuest =
    typeof window !== "undefined" &&
    localStorage.getItem("sculptor-guest") === "true";

  const [guestUserId, setGuestUserId] = useState<string | undefined>(
    () => localStorage.getItem("sculptor-guest-uid") || undefined
  );

  const getOrCreate = useMutation(api.guestUser.getOrCreateGuestUser);

  useEffect(() => {
    if (!isGuest) return;
    if (guestUserId) return; // already have one

    // Generate a stable session id
    let sessionId = localStorage.getItem("sculptor-session-id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("sculptor-session-id", sessionId);
    }

    getOrCreate({ sessionId })
      .then((id) => {
        localStorage.setItem("sculptor-guest-uid", id);
        setGuestUserId(id);
      })
      .catch((err) => {
        console.warn("Failed to create guest user:", err);
      });
  }, [isGuest, guestUserId, getOrCreate]);

  const getGuestArg = useCallback(
    () => (isGuest && guestUserId ? guestUserId : undefined),
    [isGuest, guestUserId]
  );

  return { guestUserId: isGuest ? guestUserId : undefined, isGuest, getGuestArg };
}
