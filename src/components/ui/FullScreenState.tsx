// =============================================================
// Shared full-screen UI states
// =============================================================
// Used by every "waiting on something" screen in the auth/
// workspace gate. Centralizing these means the loading screen
// and the error screen always look consistent, and — critically —
// the error screen ALWAYS has a visible retry action, so no
// failure mode can present as an infinite spinner.

interface LoadingScreenProps {
  title: string;
  subtitle?: string;
}

export function LoadingScreen({ title, subtitle }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-sky-500" />
      <div className="text-center">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

interface ErrorScreenProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onSignOut?: () => void;
}

export function ErrorScreen({ title, message, onRetry, onSignOut }: ErrorScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-sm rounded-lg border border-red-900/50 bg-red-950/30 p-6 text-center">
        <p className="text-sm font-semibold text-red-300">{title}</p>
        <p className="mt-2 text-xs text-red-200/80">{message}</p>
        <div className="mt-5 flex justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="rounded-md bg-red-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-500"
            >
              Try again
            </button>
          )}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="rounded-md border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
