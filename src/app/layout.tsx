import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import RefCapture from "@/components/RefCapture";
import PageTracker from "@/components/PageTracker";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FundingScout — Real-Time Funding Intelligence",
  description:
    "Get instant alerts when companies in your target market raise funding. Never miss a sales opportunity again.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#020617" />
      </head>
      <body
        className={`${jakarta.variable} font-sans antialiased bg-slate-950 text-white`}
        style={{ fontFamily: 'var(--font-jakarta), -apple-system, BlinkMacSystemFont, sans-serif' }}
      >
        <AuthProvider>
          <RefCapture />
          <PageTracker />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
