import "./globals.css";
import { Head } from "nextra/components";
import { Layout } from "nextra-theme-docs";
import { getPageMap } from "nextra/page-map";
import Image from "next/image";

import { DynamicNavbar } from "../components/DynamicNavbar";

const navbar = (
  <DynamicNavbar
    logo={
      <div>
        <Image
          src={`/logo.png`}
          alt="VibeX"
          height={24}
          width={24}
          style={{
            height: "24px",
            width: "auto",
            display: "inline",
            marginRight: "8px",
          }}
        />
        <b>VibeX</b>
      </div>
    }
    projectLink="https://github.com/tiwater/vibex"
  />
);

export const metadata = {
  metadataBase: new URL("https://vibex.supen.ai/"),
  title: {
    default: "VibeX - Evolve with Dedicated Agentic Teams",
    template: "%s | VibeX",
  },
  description:
    "An open-source space-oriented collaborative workspace platform for building, observing, and orchestrating autonomous multi-agent systems.",
  keywords: [
    "VibeX",
    "VibeX",
    "Space-Oriented",
    "Collaborative",
    "Workspace",
    "Platform",
    "AI",
    "Agents",
    "Autonomous",
    "Multi-Agent",
    "LLM",
    "Agent Orchestration",
    "TypeScript",
    "React",
  ],
  applicationName: "VibeX",
  generator: "Next.js",
  appleWebApp: {
    title: "VibeX",
  },
  icons: {
    icon: [
      { url: `/favicon.ico`, sizes: "16x16", type: "image/x-icon" },
      {
        url: `/favicon-16x16.png`,
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: `/favicon-32x32.png`,
        sizes: "32x32",
        type: "image/png",
      },
    ],
    shortcut: `/favicon.ico`,
    apple: `/logo.png`,
  },
  openGraph: {
    url: "https://dustland.github.io/vibex",
    siteName: "VibeX",
    locale: "en_US",
    type: "website",
  },
  other: {
    "msapplication-TileColor": "#fff",
  },
  alternates: {
    canonical: "https://dustland.github.io/vibex",
  },
};

export default async function RootLayout({ children }) {
  const pageMap = await getPageMap();
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          editLink="Edit this page on GitHub"
          docsRepositoryBase="https://github.com/tiwater/vibex/tree/main/docs"
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          pageMap={pageMap}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
