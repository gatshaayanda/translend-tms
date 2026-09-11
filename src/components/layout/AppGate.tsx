"use client";

// =============================================================
// AppGate — composes AuthContext + WorkspaceContext into the
// concrete screen sequence from the spec:
//   unauthenticated -> authenticating -> authenticated
//     -> checking_workspace -> company_setup -> application
//   (error can interrupt any step, always with a visible retry)
// =============================================================
// This is the ONE place in the app that switches on both status
// enums together. Every other component should just assume "if
// I'm rendering, I'm inside `application` and activeOrg exists."

import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LoadingScreen, ErrorScreen } from "@/components/ui/FullScreenState";
import SignInScreen from "@/components/layout/SignInScreen";
import CompanySetupScreen from "@/components/layout/CompanySetupScreen";

export default function AppGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const workspace = useWorkspace();

  // 1. Auth-level error — e.g. Firebase failed to initialize, or
  // the auth listener itself errored. Nothing downstream can work.
  if (auth.status === "error" && (!auth.error?.recoverable || !auth.user)) {
    return (
      <ErrorScreen
        title="We couldn't sign you in"
        message={auth.error?.message ?? "An unknown authentication error occurred."}
        onRetry={auth.retry}
      />
    );
  }

  // 2. Not signed in yet.
  if (auth.status === "unauthenticated") {
    return <SignInScreen />;
  }

  // 3. Popup open / initial Firebase Auth listener resolving.
  if (auth.status === "authenticating") {
    return <LoadingScreen title="Signing you in…" subtitle="Waiting on Google authentication." />;
  }

  // From here, auth.status === "authenticated" (possibly with a
  // recoverable profile-sync warning banner we surface elsewhere).

  // 4. Workspace resolution in progress.
  if (workspace.status === "idle" || workspace.status === "checking_workspace") {
    return <LoadingScreen title="Loading Translend…" subtitle="Checking your company workspace." />;
  }

  // 5. Workspace resolution failed — explicit, recoverable.
  if (workspace.status === "error") {
    return (
      <ErrorScreen
        title="We couldn't load your workspace"
        message={workspace.error ?? "An unknown workspace error occurred."}
        onRetry={workspace.refresh}
        onSignOut={auth.signOut}
      />
    );
  }

  // 6. No org yet — first-run company setup.
  if (workspace.status === "company_setup") {
    return <CompanySetupScreen />;
  }

  // 7. Fully resolved: authenticated + active org + active membership.
  if (workspace.status === "application" && workspace.activeOrg && workspace.activeMembership) {
    return <>{children}</>;
  }

  // Defensive fallback — should be unreachable given the branches
  // above, but if it's ever hit, it must NOT silently spin forever.
  return (
    <ErrorScreen
      title="Unexpected application state"
      message="Something about your session didn't resolve as expected. Retrying usually fixes this."
      onRetry={workspace.refresh}
      onSignOut={auth.signOut}
    />
  );
}
