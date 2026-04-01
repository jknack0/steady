import Link from "next/link";
import type { Metadata } from "next";
import { DemoProvisionForm } from "@/components/demo-provision-form";

export const metadata: Metadata = {
  title: "STEADY Mental Health — Clinical Platform for Modern Therapists",
  description: "HIPAA-compliant clinical platform with structured treatment programs, daily check-ins, homework tracking, and RTM billing. Built for therapists who want better outcomes.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--steady-warm-50)]">
      {/* Nav */}
      <nav className="border-b border-[var(--steady-warm-200)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: "linear-gradient(135deg, #5B8A8A, #4A7272)",
                boxShadow: "0 1px 3px rgba(91,138,138,0.3)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12h4l3-9 4 18 3-9h4" />
              </svg>
            </div>
            <span className="text-lg font-bold text-foreground">STEADY</span>
          </div>
          <Link
            href="#try-demo"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--steady-teal)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--steady-teal-dark)] transition-colors"
          >
            Try the Demo
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section id="try-demo" className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--steady-teal-bg)] px-4 py-1.5 text-sm font-medium text-[var(--steady-teal-dark)] mb-6">
            <span className="flex h-2 w-2 rounded-full bg-[var(--steady-teal)]" />
            HIPAA Compliant
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-6">
            Better outcomes through{" "}
            <span style={{ color: "var(--steady-teal)" }}>structured care</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            STEADY gives clinicians a complete toolkit for building treatment programs,
            tracking client progress between sessions, and managing RTM billing — all
            in one HIPAA-compliant platform.
          </p>
          <DemoProvisionForm />
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="bg-white border-y border-[var(--steady-warm-200)]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-3">Everything your practice needs</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From session prep to billing, STEADY handles the clinical workflow so you can focus on your clients.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  </svg>
                ),
                title: "Structured Programs",
                description: "Build treatment programs with modules, homework, assessments, and strategy cards. Assign to clients or start from proven templates.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                ),
                title: "Daily Check-ins",
                description: "Custom daily trackers with mood scales, medication logs, and symptom monitoring. Get alerts when scores drop below threshold.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                ),
                title: "Session Management",
                description: "Schedule sessions, prep with auto-generated summaries of client activity, complete with notes, and assign follow-up tasks.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                ),
                title: "Homework & Assessments",
                description: "Assign homework with recurrence, track completion, and review responses. Built-in PHQ-9, GAD-7, ASRS, and custom assessments.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" x2="12" y1="1" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                ),
                title: "RTM Billing",
                description: "Track remote therapeutic monitoring engagement, auto-calculate billing tiers, log clinician time, and generate superbills.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ),
                title: "HIPAA Compliant",
                description: "Field-level encryption, audit logging, role-based access, httpOnly auth cookies, and automatic session timeout. Built for healthcare.",
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-xl border border-[var(--steady-warm-200)] bg-[var(--steady-warm-50)] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--steady-teal-bg)] text-[var(--steady-teal)] mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-foreground mb-3">How it works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Get up and running in minutes. No lengthy onboarding, no contracts.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              step: "1",
              title: "Build your programs",
              description: "Start from a template or build from scratch. Add modules for each week, fill them with content, homework, and assessments. Or create a custom program directly for a specific client.",
            },
            {
              step: "2",
              title: "Enroll your clients",
              description: "Assign programs to clients with one click. They get the STEADY mobile app where they complete homework, fill out daily check-ins, journal, and prepare for sessions.",
            },
            {
              step: "3",
              title: "Track and treat",
              description: "See real-time progress on your dashboard. Prep for sessions with auto-generated summaries. Get alerts when clients need attention. Bill RTM codes with generated superbills.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white mx-auto mb-5"
                style={{
                  background: "linear-gradient(135deg, #5B8A8A, #4A7272)",
                }}
              >
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--steady-teal)] text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to see it for yourself?</h2>
          <p className="text-white/80 max-w-xl mx-auto mb-8 leading-relaxed">
            Enter your name and email above and you'll be exploring the full platform
            in seconds. Pre-loaded with sample programs and clients.
          </p>
          <Link
            href="#try-demo"
            className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-[var(--steady-teal-dark)] hover:bg-white/90 transition-colors shadow-sm"
          >
            Try the Demo
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--steady-warm-200)] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded"
              style={{ background: "linear-gradient(135deg, #5B8A8A, #4A7272)" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l3-9 4 18 3-9h4" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-foreground">STEADY Mental Health</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Steady Mental Health. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
