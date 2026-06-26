import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const heading = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://daze.drkbl.co"),
  title: "Daze — never miss a birthday again",
  description:
    "Daze watches your contacts and the calendar and nudges you on Pushover for birthdays and holidays — day-of or as far ahead as you like.",
  openGraph: {
    title: "Daze — never miss a birthday again",
    description:
      "Birthday and holiday reminders via Pushover. Day-of or days ahead, with your notes attached.",
    url: "https://daze.drkbl.co",
    siteName: "Daze",
    images: ["/screenshots/dashboard-light.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${heading.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
