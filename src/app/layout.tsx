import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Translend TMS · Truck Division",
  description: "Independent transport management application for Translend TMS.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
