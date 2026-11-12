import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Global Buy",
  description: "Shopping spreadsheets for popular buying agents.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/css/home.css" />
        <link rel="stylesheet" href="/css/yang.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
