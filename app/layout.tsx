import type { Metadata } from "next";
import { Varela_Round } from "next/font/google";
import { Theme } from "@radix-ui/themes";
import { Analytics } from "@vercel/analytics/next";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import Scene from "./components/Scene";
import VersionBadge from "./components/VersionBadge";

const varelaRound = Varela_Round({ variable: "--font-varela", subsets: ["latin"], weight: "400" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://turtletalk.io';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: 'TurtleTalk',
    template: '%s | TurtleTalk',
  },
  description:
    'TurtleTalk is a safe, friendly AI voice companion for children aged 5–13. ' +
    'Chat with Shelly the sea turtle, complete brave challenges, and grow your courage garden — one mission at a time.',
  keywords: [
    'kids app', 'AI for children', 'educational', 'sea turtle', 'voice chat',
    'children learning', 'brave challenges', 'emotional growth', 'safe AI', 'Shelly',
  ],
  authors: [{ name: 'TurtleTalk' }],
  creator: 'TurtleTalk',
  applicationName: 'TurtleTalk',
  category: 'education',

  icons: {
    icon: '/TurtleTalk---Logo.png',
    apple: '/TurtleTalk---Logo.png',
  },

  openGraph: {
    type: 'website',
    url: APP_URL,
    siteName: 'TurtleTalk',
    title: 'TurtleTalk – Chat with Shelly the Sea Turtle 🐢',
    description:
      'A safe AI voice companion for children aged 5–13. ' +
      'Talk to Shelly, earn brave missions, and build confidence one adventure at a time.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'TurtleTalk – Shelly the friendly sea turtle',
      },
    ],
    locale: 'en_US',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'TurtleTalk – Chat with Shelly 🐢',
    description:
      'Safe AI voice chat for kids aged 5–13. Talk to Shelly, earn brave missions, grow your courage garden!',
    images: ['/opengraph-image'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },

  // Helps AI agents understand what this app is
  other: {
    'ai:description':
      'TurtleTalk is a child-safe AI voice application where children (aged 5–13) have short, ' +
      'warm conversations with Shelly, a friendly sea turtle persona powered by Claude. ' +
      'Each conversation ends with 3 graded challenge missions (easy/medium/stretch) that encourage ' +
      'real-world brave acts. The app stores missions and conversation history locally. ' +
      'There is a parent dashboard for weekly summaries and dinner-time conversation starters.',
    'ai:audience': 'children aged 5–13 and their parents/carers',
    'ai:content-safety': 'child-safe — all content is guardrail-checked for appropriateness',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${varelaRound.variable} antialiased`}>
        <Theme>
          <Scene />
          {children}
          <VersionBadge />
          <Analytics />
        </Theme>
      </body>
    </html>
  );
}
