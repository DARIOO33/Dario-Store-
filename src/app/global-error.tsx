"use client";

// Last resort, when even the main layout fails: plain HTML, no dictionaries or styles available.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f3ede0", color: "#17130f", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <div>
          <h1>Dario Store is having a problem</h1>
          <p>Please try again in a moment. · Un problème est survenu, réessayez dans un instant.</p>
          <button type="button" onClick={reset} style={{ padding: "0.8rem 1.4rem", border: "2px solid #17130f", background: "#ffd400", fontWeight: 700, cursor: "pointer" }}>
            Try again · Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
