"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#faf9f7",
          color: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center", padding: "0 24px" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: 28,
            }}
          >
            !
          </div>

          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            {error.message || "An unexpected error occurred. Please try again."}
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={reset}
              style={{
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                color: "#fff",
                backgroundColor: "#5B8A8A",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Try again
            </button>

            <a
              href="/dashboard"
              style={{
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                color: "#374151",
                backgroundColor: "#fff",
                border: "1px solid #d4d4d4",
                borderRadius: 8,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Return to dashboard
            </a>
          </div>

          {error.digest && (
            <p
              style={{
                marginTop: 24,
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
