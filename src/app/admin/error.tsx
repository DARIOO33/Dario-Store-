"use client";

// Admin pages: show what failed so it can be reported, and let the admin retry.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="panel">
      <h1 style={{ fontSize: "2rem" }}>Something went wrong</h1>
      <p className="muted">
        This page hit an error{error.digest ? ` (reference ${error.digest}, see the server log)` : ""}. Try again; if it keeps happening, check the server log.
      </p>
      <button type="button" className="btn btnAccent" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
