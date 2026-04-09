/**
 * Centralized query key factory for TanStack Query.
 *
 * All query keys are defined here so that cache invalidation is consistent
 * and typo-free. Convention: plural entity names always.
 */

export const queryKeys = {
  // ── Auth ──────────────────────────────────────────────
  auth: {
    user: ["auth-user"] as const,
  },

  // ── Programs ──────────────────────────────────────────
  programs: {
    all: ["programs"] as const,
    detail: (id: string) => ["programs", id] as const,
    modules: (programId: string) =>
      ["programs", programId, "modules"] as const,
    parts: (programId: string, moduleId: string) =>
      ["programs", programId, "modules", moduleId, "parts"] as const,
    templates: ["program-templates"] as const,
    clientPrograms: ["client-programs"] as const,
  },

  // ── Enrollments ───────────────────────────────────────
  enrollments: {
    byProgram: (programId: string) => ["enrollments", programId] as const,
    overrides: (enrollmentId: string, moduleId?: string) =>
      ["overrides", enrollmentId, moduleId] as const,
  },

  // ── Participants / Clients ────────────────────────────
  participants: {
    all: (params?: { search?: string; programId?: string }) =>
      ["clinician-participants", params] as const,
    detail: (id: string) => ["clinician-participant", id] as const,
    search: (query: string) => ["participant-search", query] as const,
    stats: (id: string, dateRange?: { start?: string; end?: string }) =>
      ["participant-stats", id, dateRange] as const,
    checkin: (participantId: string) =>
      ["participant-checkin", participantId] as const,
    clients: ["clinician-clients"] as const,
  },

  // ── Sessions ──────────────────────────────────────────
  sessions: {
    all: (params?: {
      status?: string;
      enrollmentId?: string;
      startDate?: string;
      endDate?: string;
    }) => ["sessions", params] as const,
    prepare: (sessionId: string) =>
      ["session-prepare", sessionId] as const,
    prep: (appointmentId: string) =>
      ["session-prep", appointmentId] as const,
  },

  // ── Appointments ──────────────────────────────────────
  appointments: {
    all: (params?: Record<string, unknown>) =>
      ["appointments", params] as const,
    detail: (id: string) => ["appointment", id] as const,
    billable: ["appointments", "billable"] as const,
    unbilled: ["appointments", "unbilled"] as const,
  },

  // ── Invoices ──────────────────────────────────────────
  invoices: {
    all: (params?: Record<string, unknown>) =>
      ["invoices", params] as const,
    detail: (id: string) => ["invoices", id] as const,
  },

  // ── Payments ──────────────────────────────────────────
  payments: {
    byInvoice: (invoiceId: string) =>
      ["payments", invoiceId] as const,
  },

  // ── Billing ───────────────────────────────────────────
  billing: {
    summary: ["billing-summary"] as const,
    profile: ["billing-profile"] as const,
  },

  // ── Claims ────────────────────────────────────────────
  claims: {
    all: (filters?: { status?: string }, cursor?: string) =>
      ["claims", filters, cursor] as const,
    detail: (id: string) => ["claims", id] as const,
  },

  // ── Insurance ─────────────────────────────────────────
  insurance: {
    byParticipant: (participantId: string) =>
      ["insurance", participantId] as const,
  },

  // ── Payers ────────────────────────────────────────────
  payers: {
    search: (query: string) => ["payers", query] as const,
  },

  // ── Diagnosis Codes ───────────────────────────────────
  diagnosisCodes: {
    search: (query: string, participantId?: string) =>
      ["diagnosis-codes", query, participantId] as const,
  },

  // ── Saved Cards ───────────────────────────────────────
  savedCards: {
    byParticipant: (participantId: string) =>
      ["saved-cards", participantId] as const,
  },

  // ── Stripe ────────────────────────────────────────────
  stripe: {
    connectionStatus: ["stripe-connection-status"] as const,
  },

  // ── Daily Trackers ────────────────────────────────────
  dailyTrackers: {
    byProgram: (programId: string) =>
      ["daily-trackers", programId] as const,
    detail: (trackerId: string) =>
      ["daily-tracker", trackerId] as const,
    templates: ["tracker-templates"] as const,
    entries: (
      trackerId: string,
      userId: string,
      dateRange?: { startDate?: string; endDate?: string },
    ) => ["tracker-entries", trackerId, userId, dateRange] as const,
    trends: (trackerId: string, userId: string) =>
      ["tracker-trends", trackerId, userId] as const,
  },

  // ── RTM ───────────────────────────────────────────────
  rtm: {
    dashboard: ["rtm-dashboard"] as const,
    detail: (enrollmentId: string) =>
      ["rtm-detail", enrollmentId] as const,
    enrollments: ["rtm-enrollments"] as const,
    superbill: (periodId: string) => ["superbill", periodId] as const,
  },

  // ── Config ────────────────────────────────────────────
  config: {
    clinician: ["clinician-config"] as const,
    stedi: ["stedi-config"] as const,
    client: (clientId: string) => ["client-config", clientId] as const,
  },

  // ── Notifications ─────────────────────────────────────
  notifications: {
    preferences: ["notification-preferences"] as const,
  },

  // ── Invitations ───────────────────────────────────────
  invitations: {
    all: (params?: { status?: string }) =>
      ["invitations", params] as const,
    detail: (id: string) => ["invitation", id] as const,
  },

  // ── Practice ──────────────────────────────────────────
  practices: {
    all: ["practices"] as const,
    stats: (practiceId: string) =>
      ["practice-stats", practiceId] as const,
    participants: (
      practiceId: string,
      params?: { search?: string; cursor?: string },
    ) => ["practice-participants", practiceId, params] as const,
  },

  // ── Locations ─────────────────────────────────────────
  locations: {
    all: ["locations"] as const,
  },

  // ── Service Codes ─────────────────────────────────────
  serviceCodes: {
    all: ["service-codes"] as const,
  },

  // ── Recurring Series ──────────────────────────────────
  recurringSeries: {
    all: (params?: Record<string, unknown>) =>
      ["recurring-series", params] as const,
    detail: (id: string) => ["recurring-series", id] as const,
  },
} as const;
