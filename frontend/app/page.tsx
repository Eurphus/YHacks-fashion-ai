"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

const journey = [
  {
    title: "Capture",
    body: "Record a clean five-second look in the studio with framing built for full-outfit shots.",
  },
  {
    title: "Direct",
    body: "Describe the silhouette, palette, mood, or references you want to explore in plain language.",
  },
  {
    title: "Review",
    body: "See the updated motion clip, compare the direction, and quickly retake or refine.",
  },
];

const highlights = [
  "Camera-guided recording",
  "Prompt-led outfit direction",
  "Motion-preserving previews",
  "Fast review and retake flow",
];

const useCases = [
  "Try a sharper editorial direction before a shoot.",
  "Prototype wardrobe ideas without changing on camera.",
  "Pitch styling concepts with motion instead of static mockups.",
];

const pillars = [
  {
    label: "Studio Workflow",
    value: "One focused space for recording, prompting, and reviewing.",
  },
  {
    label: "Visual Consistency",
    value: "Keeps the scene and movement intact while the look changes.",
  },
  {
    label: "Creative Control",
    value: "Use natural language to push toward tailored, casual, dramatic, or minimal directions.",
  },
];

const programNotes = [
  {
    title: "For stylists and creative teams",
    body: "Move from mood to motion quickly when you need to test a direction, sell a concept, or explore a sharper point of view.",
  },
  {
    title: "For personal experimentation",
    body: "Try a new silhouette or energy before committing to a purchase, a shoot, or a full styling change.",
  },
  {
    title: "For iterative sessions",
    body: "Capture once, refine with better prompts, and keep reviewing until the direction feels right.",
  },
];

const closingStats = [
  { value: "5 sec", label: "guided recording window" },
  { value: "1 flow", label: "record, direct, review" },
  { value: "0 friction", label: "no setup once you enter" },
];

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, login, user } = useUser();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = () => {
    setIsLoggingIn(true);
    if (!isAuthenticated) {
      login();
    }
    router.push("/studio");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] px-6 py-10 sm:px-8 lg:px-12">
      <div
        className="pointer-events-none absolute left-[-8%] top-[-14%] h-[620px] w-[620px] rounded-full opacity-30 blur-[130px]"
        style={{
          background:
            "radial-gradient(circle, rgba(232, 104, 79, 0.85) 0%, rgba(165, 41, 91, 0.55) 48%, transparent 72%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[-18%] right-[-10%] h-[520px] w-[520px] rounded-full opacity-30 blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, rgba(35, 113, 161, 0.8) 0%, rgba(19, 42, 88, 0.58) 48%, transparent 72%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 32%), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 72px 72px, 72px 72px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          <section className="animate-fade-in">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #ec6a4f 0%, #be3e77 48%, #1d5e8d 100%)",
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
                  className="h-6 w-6"
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
                      "linear-gradient(90deg, #ffd7b3 0%, #ff9f7b 28%, #d96aa7 65%, #7ec5ff 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  FashionAI
                </span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                  Studio
                </span>
              </div>
            </div>

            <div className="mt-8 inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
              Record your look, direct the style, and watch it transform in motion
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Step into the studio, shape a new wardrobe direction, and{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg, #ffd7b3 0%, #ff9f7b 28%, #d96aa7 65%, #7ec5ff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                watch the look evolve on your clip
              </span>
              .
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/55 sm:text-lg">
              FashionAI Studio turns a short outfit recording into a guided
              styling session. Capture your look, describe the direction you
              want, and review a refreshed version of the same moment without
              leaving the flow.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              {highlights.map((label) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background:
                        "linear-gradient(135deg, #ff9f7b 0%, #d96aa7 60%, #7ec5ff 100%)",
                    }}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium text-white/70">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {journey.map(({ title, body }) => (
                <div
                  key={title}
                  className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.04))] p-5"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/72">
                    {title}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/46">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[28px] border border-white/10 bg-[#11131b]/85 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                  Why teams use it
                </p>
                <div className="mt-5 space-y-4">
                  {useCases.map((item) => (
                    <div key={item} className="flex gap-3">
                      <span
                        className="mt-2 h-2 w-2 flex-none rounded-full"
                        style={{
                          background:
                            "linear-gradient(135deg, #ff9f7b 0%, #d96aa7 55%, #7ec5ff 100%)",
                        }}
                        aria-hidden="true"
                      />
                      <p className="text-sm leading-7 text-white/60">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/20 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                  Built for the full pass
                </p>
                <div className="mt-5 grid gap-4">
                  {pillars.map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/8 bg-white/[0.04] p-4"
                    >
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="mt-2 text-sm leading-6 text-white/48">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="animate-slide-up">
            <div
              className="rounded-[32px] p-6 sm:p-7"
              style={{
                background:
                  "linear-gradient(180deg, rgba(14, 16, 24, 0.94) 0%, rgba(9, 10, 16, 0.9) 100%)",
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
                    {isAuthenticated ? "Studio ready" : "Welcome"}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    {isAuthenticated
                      ? "Open FashionAI Studio"
                      : "Enter FashionAI Studio"}
                  </h2>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-white/45">
                {isAuthenticated
                  ? "Your session is already active. Jump back into the camera studio whenever you're ready."
                  : "Your workspace is ready. Continue into the camera studio to record, direct, and review a new look in one pass."}
              </p>

              <div
                className="mt-6 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5"
                role="region"
                aria-label="Studio access"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, #ec6a4f 0%, #d96aa7 58%, #1d5e8d 100%)",
                    }}
                    aria-hidden="true"
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight text-white">
                      {user.name}
                    </p>
                    <p className="text-xs capitalize text-white/40">
                      {user.role.replace("_", " ")} •{" "}
                      <span className="font-mono text-[11px] text-[#ffb08d]">
                        {user.id}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    "5-second guided recording",
                    "Prompt-led styling direction",
                    "Live before-and-after review",
                    "Polished studio session flow",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-sm text-white/58"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          background:
                            "linear-gradient(135deg, #ff9f7b 0%, #d96aa7 60%, #7ec5ff 100%)",
                        }}
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-white/8 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/36">
                  Session view
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    ["01", "Record"],
                    ["02", "Describe"],
                    ["03", "Review"],
                  ].map(([step, label]) => (
                    <div
                      key={step}
                      className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3"
                    >
                      <p className="text-xs font-mono text-white/35">{step}</p>
                      <p className="mt-2 text-sm font-semibold text-white/82">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                aria-label="Enter FashionAI Studio as Peter Macdonald"
                className="
                  relative mt-6 flex w-full items-center justify-center gap-3 overflow-hidden
                  rounded-2xl px-6 py-4 text-base font-semibold tracking-wide text-white
                  transition-all duration-200 active:scale-[0.98]
                  disabled:cursor-not-allowed disabled:opacity-60
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9f7b]
                  focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]
                "
                style={{
                  background:
                    "linear-gradient(135deg, #ec6a4f 0%, #d96aa7 48%, #1d5e8d 100%)",
                  boxShadow:
                    "0 10px 36px rgba(217, 106, 167, 0.3), 0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                <span
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
                  }}
                  aria-hidden="true"
                />

                {isLoggingIn ? (
                  <>
                    <span
                      className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                      aria-hidden="true"
                    />
                    <span>Opening Studio...</span>
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
                      className="h-5 w-5 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <circle cx="7.5" cy="15.5" r="4.5" />
                      <path d="m21 2-9.6 9.6" />
                      <path d="m15.5 7.5 3 3L22 7l-3-3" />
                    </svg>
                    <span>{isAuthenticated ? "Open Studio" : "Continue as Peter"}</span>
                  </>
                )}
              </button>

              <p className="mt-5 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-xs leading-6 text-white/34">
                Entering the studio takes you directly into recording and style
                direction so you can move from first capture to review without
                setup steps in between.
              </p>
            </div>
          </section>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-12 w-full max-w-7xl">
        <section className="rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,12,20,0.92),rgba(13,16,26,0.82))] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/36">
                Inside the program
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
                A fashion tool that feels more like a creative session than a
                technical workflow.
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/52 sm:text-base">
                FashionAI is built to keep momentum high. You enter, record one
                clean clip, describe the direction you want, and immediately see
                the result in the same space. No dashboard maze, no extra setup,
                no disconnected steps.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {closingStats.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-5 text-center"
                >
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/38">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {programNotes.map(({ title, body }) => (
              <div
                key={title}
                className="rounded-[26px] border border-white/8 bg-black/20 p-5"
              >
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-3 text-sm leading-6 text-white/48">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(236,106,79,0.14),rgba(217,106,167,0.12),rgba(29,94,141,0.14))] p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                Ready to enter
              </p>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/58 sm:text-base">
                Record your look, direct the style, and review the result in one
                continuous studio pass.
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="rounded-2xl border border-white/12 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingIn
                ? "Opening Studio..."
                : isAuthenticated
                  ? "Open Studio"
                  : "Start Session"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
