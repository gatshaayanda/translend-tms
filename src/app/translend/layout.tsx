import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Translend TMS · Truck Division",
  description: "Transport management application for Translend TMS.",
};

export default function TranslendLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
