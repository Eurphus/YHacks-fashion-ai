"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, login, user } = useUser();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/studio");
    }
  }, [isAuthenticated, router]);

  const handleLogin = () => {
    setIsLoggingIn(true);
    login();
    router.push("/studio");
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/40 border-t-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] relative overflow-hidden px-6 py-10 sm:px-8 lg:px-12">
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, #a855f7 0%, #7c3aed 50%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[100px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, #ec4899 0%, #db2777 50%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-10 blur-[80px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, #f97316 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          <section className="animate-fade-in">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #a855f7 0%, #ec4899 60%, #f97316 100%)",
                }}
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                  aria-hidden="true"
                >
                  <path d="M12 3a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.73V8l8 6H3l8-6V6.73A2 2 0 0 1 12 3z" />
                  <path d="M3 14v1a9 9 0 0 0 18 0v-1" />
                </svg>
              </div>

              <div className="flex flex-col items-start">
                <span
                  className="text-2xl font-bold tracking-tight leading-none"
                  style={{
                    background:
                      "linear-gradient(90deg, #a855f7 0%, #ec4899 55%, #f97316 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  FashionAI
                </span>
                <span className="text-[10px] font-semibold tracking-[0.2em] text-white/30 uppercase mt-0.5">
                  Studio
                </span>
              </div>
            </div>

            <div className="mt-8 inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
              Welcome to the private beta
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Walk in, record your look, and{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg, #a855f7 0%, #ec4899 55%, #f97316 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                explore a new style direction
              </span>
              .
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/55 sm:text-lg">
              FashionAI Studio is a guided outfit transformation experience.
              Capture a short clip, describe the vibe you want, and step through
              a fast before-and-after reveal built for fashion experimentation.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Record",
                  body: "Use the camera studio to capture a clean, full-outfit moment.",
                },
                {
                  title: "Prompt",
                  body: "Describe the materials, silhouette, or energy you want to try.",
                },
                {
                  title: "Reveal",
                  body: "Review the transformed motion clip and retake whenever you want.",
                },
              ].map(({ title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                    {title}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/42">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              {[
                "Camera-guided capture",
                "Prompt-based styling",
                "Instant studio review",
              ].map((label) => (
                <div
                  key={label}
                  className="glass flex items-center gap-1.5 rounded-full px-4 py-2"
                >
                  <span className="h-2 w-2 rounded-full bg-purple-400" aria-hidden="true" />
                  <span className="text-xs font-medium text-white/55">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="animate-slide-up">
            <div
              className="rounded-[28px] p-6 sm:p-7"
              style={{
                background: "rgba(12, 12, 18, 0.82)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow:
                  "0 24px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
                    Sign in
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    Enter your studio session
                  </h2>
                </div>

                <span className="rounded-full border border-purple-500/20 bg-purple-500/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-purple-300">
                  Beta
                </span>
              </div>

              <p className="mt-4 text-sm leading-7 text-white/45">
                Your access is ready. Sign in below to open the recording flow
                and start testing style transformations right away.
              </p>

              <div
                className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-5"
                role="region"
                aria-label="Beta access"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                    }}
                    aria-hidden="true"
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold leading-tight">
                      {user.name}
                    </p>
                    <p className="text-white/40 text-xs capitalize">
                      {user.role.replace("_", " ")} ·{" "}
                      <span className="text-purple-400/80 font-mono text-[11px]">
                        {user.id}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    "5-second guided recording",
                    "Prompt-driven look generation",
                    "Fast retake and review flow",
                    "Built for private testing",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-white/58">
                      <span
                        className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                aria-label="Log in as Peter Macdonald"
                className="
                  relative mt-6 w-full flex items-center justify-center gap-3
                  px-6 py-4 rounded-2xl
                  text-white font-semibold text-base tracking-wide
                  transition-all duration-200
                  active:scale-[0.98]
                  disabled:opacity-60 disabled:cursor-not-allowed
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]
                  overflow-hidden
                "
                style={{
                  background:
                    "linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 100%)",
                  boxShadow:
                    "0 8px 32px rgba(168, 85, 247, 0.45), 0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                <span
                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
                  }}
                  aria-hidden="true"
                />

                {isLoggingIn ? (
                  <>
                    <span
                      className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                      aria-hidden="true"
                    />
                    <span>Entering Studio…</span>
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <circle cx="7.5" cy="15.5" r="4.5" />
                      <path d="m21 2-9.6 9.6" />
                      <path d="m15.5 7.5 3 3L22 7l-3-3" />
                    </svg>
                    <span>Log In as Peter</span>
                  </>
                )}
              </button>

              <p className="mt-5 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-xs leading-6 text-white/34">
                This is a private demo environment with mock sign-in. Once you
                enter, you&apos;ll go straight into the camera studio.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
