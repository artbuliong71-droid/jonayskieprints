import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jonayskie Prints",
  description: "Manage your print orders efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
