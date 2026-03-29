"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

const notes = [
  "Try a new shape before you buy anything.",
  "See an idea on yourself in a few seconds.",
];

const steps = [
  ["01", "Record."],
  ["02", "Describe."],
  ["03", "Review."],
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
    <div className="min-h-screen bg-[var(--background)] px-6 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between border-b border-black/10 pb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-black/35">
              Model Studio
            </p>
            <p className="mt-1 text-sm text-black/45">
              Try on a new direction.
            </p>
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingIn
              ? "Opening..."
              : isAuthenticated
                ? "Open studio"
                : "Enter studio"}
          </button>
        </header>

        <main className="flex flex-1 items-center py-10 sm:py-14">
          <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <section className="animate-fade-in">
              <p className="text-sm uppercase tracking-[0.24em] text-black/30">
                Try on a look before you commit
              </p>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] text-black sm:text-5xl lg:text-[4.2rem]">
                See a different look on yourself before you buy it, order it, or
                go looking for it.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-black/60">Record a short clip, describe the change, and see it back on you.</p>

              <div className="mt-8 space-y-3">
                {notes.map((note) => (
                  <div
                    key={note}
                    className="flex items-start gap-3 text-base leading-7 text-black/58"
                  >
                    <span className="mt-3 h-1.5 w-1.5 rounded-full bg-black/55" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="animate-slide-up">
              <div className="rounded-[28px] border border-black/10 bg-white/72 p-6 shadow-[0_20px_60px_rgba(26,26,26,0.08)] backdrop-blur-sm sm:p-7">
                <div className="border-b border-black/8 pb-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-black/35">
                    Session
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-black">
                    {isAuthenticated ? "Studio is ready" : "Start a new pass"}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-black/55">
                    {isAuthenticated
                      ? "You already have a session open. Step back into the studio whenever you want."
                      : "A simple three-step flow."}
                  </p>
                </div>

                <div className="mt-5 rounded-[22px] bg-[#f4efe8] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">
                        {user.name}
                      </p>
                      <p className="text-xs capitalize text-black/45">
                        {user.role.replace("_", " ")} - {user.id}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {steps.map(([step, label]) => (
                      <div
                        key={step}
                        className="flex items-center justify-between border-b border-black/8 py-3 last:border-b-0 last:pb-0"
                      >
                        <span className="text-xs font-mono text-black/35">
                          {step}
                        </span>
                        <span className="text-sm text-black/70">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  aria-label="Enter Model Studio as Peter Macdonald"
                  className="mt-6 w-full rounded-2xl bg-black px-5 py-4 text-base font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingIn
                    ? "Opening studio..."
                    : isAuthenticated
                      ? "Open studio"
                      : "Continue as Peter"}
                </button>

                
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

