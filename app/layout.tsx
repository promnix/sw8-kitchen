import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SW8 Kitchen | Customer Rewards",
  description: "View your SW8 Kitchen rewards, purchases, and customer credit.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/icon.png",
    apple: [{ url: "/icon.png", type: "image/png", sizes: "512x512" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
