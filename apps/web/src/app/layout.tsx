import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "STEADY Mental Health — Clinical Platform for Modern Therapists",
  description: "HIPAA-compliant clinical platform with structured treatment programs, daily check-ins, homework tracking, and RTM billing. Built for therapists who want better outcomes.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "STEADY Mental Health",
    description: "Clinical platform for structured care, progress tracking, and RTM billing.",
    siteName: "STEADY Mental Health",
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
