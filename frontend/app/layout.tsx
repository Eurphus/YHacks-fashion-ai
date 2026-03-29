import type { Metadata, Viewport } from "next";
import { UserProvider } from "@/context/UserContext";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FashionAI Studio",
    template: "%s | FashionAI Studio",
  },
  description:
    "Record your outfit, direct the style you want, and review a refreshed look in a guided studio flow.",
  keywords: ["fashion", "AI", "outfit", "style", "virtual try-on"],
  authors: [{ name: "FashionAI" }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "FashionAI Studio",
    description:
      "A guided fashion studio for recording your look, directing a new style, and reviewing the result.",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
    { media: "(prefers-color-scheme: light)", color: "#0a0a0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased"
        style={{
          fontFamily:
            '"Aptos", "Segoe UI Variable", "Trebuchet MS", "Segoe UI", sans-serif',
        }}
      >
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
