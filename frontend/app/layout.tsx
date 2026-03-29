import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { UserProvider } from "@/context/UserContext";
import "./globals.css";

// ── Fonts ──────────────────────────────────────────────────────────────────────

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// ── Metadata ───────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: "FashionAI Studio",
    template: "%s · FashionAI Studio",
  },
  description:
    "Record your outfit, describe the vibe, and watch AI transform your look in seconds. Private beta.",
  keywords: ["fashion", "AI", "outfit", "style", "virtual try-on"],
  authors: [{ name: "FashionAI" }],
  robots: {
    index: false, // Private beta — keep out of search engines
    follow: false,
  },
  openGraph: {
    title: "FashionAI Studio",
    description: "AI-powered outfit transformation. Private beta.",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Prevent iOS from auto-zooming on input focus
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
    { media: "(prefers-color-scheme: light)", color: "#0a0a0f" },
  ],
};

// ── Root Layout ────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Preconnect to Google Fonts CDN so font files load faster.
          Next.js font optimisation handles the actual <link> tags, but the
          preconnect gives the browser an early hint.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className="antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)]"
        style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
      >
        {/*
          UserProvider — wraps the entire application so that every page and
          component tree can access the pseudo-auth context via useUser().

          The provider is a client component but placing it here in the server
          layout is fine in Next.js 14 App Router: the server layout renders the
          provider shell, and the "use client" boundary is respected at runtime.
        */}
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
