"use client";

// =============================================================
// AuthContext — explicit authentication state machine
// =============================================================
// This directly fixes the old Translend defect: a "Loading
// Translend..." / "Checking your company workspace." screen that
// never resolved because loading was a single boolean instead of
// a real state machine with an error branch and a recovery path.
//
// States (per spec):
//   unauthenticated | authenticating | authenticated |
//   checking_workspace | company_setup | application | error
//
// This context owns ONLY authentication — not workspace
// resolution. WorkspaceContext (separate file) consumes
// `status === "authenticated"` and decides checking_workspace vs
// company_setup vs application. Keeping these separate means an
// auth failure and a workspace failure never get confused with
// each other, which was part of what made the old bug hard to
// debug.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebase } from "@/lib/firebase/client";
import { ensureUserProfile } from "@/lib/firebase/workspace";

export type AuthStatus =
  | "unauthenticated"
  | "authenticating"
  | "authenticated"
  | "error";
// Note: "checking_workspace" / "company_setup" / "application" are
// WorkspaceContext states layered on top of "authenticated" — see
// WorkspaceContext.tsx. Keeping the union here to "authenticated"
// is intentional; it's the full set AuthContext itself can be in.

export interface AuthError {
  message: string;
  code: string;
  recoverable: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  error: AuthError | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Clears an error and returns to "unauthenticated" so the user
   * can retry without a full page reload. */
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toAuthError(err: unknown): AuthError {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "unknown";
  const message = err instanceof Error ? err.message : "An unexpected authentication error occurred.";
  return { message, code, recoverable: true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("authenticating");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const { auth } = getFirebase();
      unsub = onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          if (firebaseUser) {
            try {
              await ensureUserProfile(firebaseUser.uid, {
                email: firebaseUser.email ?? "",
                displayName: firebaseUser.displayName ?? firebaseUser.email ?? "Unknown",
                photoURL: firebaseUser.photoURL,
              });
              setUser(firebaseUser);
              setStatus("authenticated");
              setError(null);
            } catch (err) {
              // Profile write failed (e.g. Firestore rules / network).
              // This is recoverable — the user IS authenticated with
              // Firebase, we just couldn't sync their profile doc yet.
              console.error("[AuthContext] ensureUserProfile failed:", err);
              setUser(firebaseUser);
              setStatus("authenticated");
              setError({
                message: "Signed in, but we couldn't sync your profile. Some features may be limited until this resolves.",
                code: "profile/sync-failed",
                recoverable: true,
              });
            }
          } else {
            setUser(null);
            setStatus("unauthenticated");
            setError(null);
          }
        },
        (err) => {
          console.error("[AuthContext] onAuthStateChanged error:", err);
          setStatus("error");
          setError(toAuthError(err));
        }
      );
    } catch (err) {
      // getFirebase() threw synchronously — config/init problem.
      // This is the exact failure mode that used to produce an
      // infinite spinner. Now it lands in an explicit error state.
      setStatus("error");
      setError(toAuthError(err));
    }
    return () => unsub?.();
  }, []);

  const signInWithGoogle = async () => {
    setStatus("authenticating");
    setError(null);
    try {
      const { auth } = getFirebase();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      // onAuthStateChanged above will flip status to "authenticated".
    } catch (err) {
      const authErr = toAuthError(err);
      // A user closing the popup shouldn't be surfaced as a hard
      // error banner — just fall back to unauthenticated quietly.
      if (authErr.code === "auth/popup-closed-by-user" || authErr.code === "auth/cancelled-popup-request") {
        setStatus("unauthenticated");
        return;
      }
      setStatus("error");
      setError(authErr);
    }
  };

  const signOut = async () => {
    try {
      const { auth } = getFirebase();
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("[AuthContext] signOut failed:", err);
    } finally {
      setUser(null);
      setStatus("unauthenticated");
      setError(null);
    }
  };

  const retry = () => {
    setError(null);
    setStatus(user ? "authenticated" : "unauthenticated");
  };

  const value = useMemo(
    () => ({ status, user, error, signInWithGoogle, signOut, retry }),
    [status, user, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
