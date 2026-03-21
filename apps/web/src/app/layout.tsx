import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "STEADY with ADHD — Clinician Dashboard",
  description: "Clinician dashboard and Clinical Assessment System for the STEADY with ADHD study",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={plusJakarta.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
