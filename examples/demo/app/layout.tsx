import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vibex Demo",
  description: "Demo application for Vibex framework",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
