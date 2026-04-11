import { prisma } from "@steady/db";
import { logger } from "../lib/logger";

// ── SES Circuit Breaker (COND-23) ──────────────────────────────────
// Tracks rolling bounce/complaint rates. Opens the circuit (blocks
// outbound sends) when:
//   - bounce rate > 5% AND total sent >= 20 in the current window
//   - complaint rate > 0.1% AND total sent >= 20 in the current window
//
// Circuit auto-closes after 4 hours OR on manual clear via admin.
// Loss of reputation = SES account suspension = catastrophe. This is
// a hard gate before every send.

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const AUTO_CLOSE_MS = 4 * 60 * 60 * 1000; // 4h
const MIN_SENDS_BEFORE_CHECK = 20;
const BOUNCE_RATE_THRESHOLD = 0.05;
const COMPLAINT_RATE_THRESHOLD = 0.001;

async function getOrCreateState() {
  const state = await prisma.sesCircuitBreakerState.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  return state;
}

async function maybeResetWindow(state: { windowStart: Date }) {
  if (state.windowStart.getTime() + WINDOW_MS < Date.now()) {
    await prisma.sesCircuitBreakerState.update({
      where: { id: "singleton" },
      data: {
        totalSent: 0,
        totalBounced: 0,
        totalComplained: 0,
        windowStart: new Date(),
      },
    });
  }
}

async function maybeAutoClose(state: {
  isOpen: boolean;
  openedAt: Date | null;
}) {
  if (
    state.isOpen &&
    state.openedAt &&
    state.openedAt.getTime() + AUTO_CLOSE_MS < Date.now()
  ) {
    await prisma.sesCircuitBreakerState.update({
      where: { id: "singleton" },
      data: { isOpen: false, openedAt: null, openReason: null },
    });
    logger.info("SES circuit breaker auto-closed after 4h");
    return false;
  }
  return state.isOpen;
}

/**
 * Check whether the circuit is open. Workers call this before every send.
 * Returns true when the circuit is open and the send MUST be skipped.
 */
export async function isCircuitOpen(): Promise<boolean> {
  let state = await getOrCreateState();
  await maybeResetWindow(state);
  state = await getOrCreateState(); // re-read in case reset happened
  return maybeAutoClose(state);
}

/**
 * Record a successful send. Updates window counters.
 */
export async function recordSend(): Promise<void> {
  await getOrCreateState();
  await prisma.sesCircuitBreakerState.update({
    where: { id: "singleton" },
    data: { totalSent: { increment: 1 } },
  });
}

/**
 * Record a bounce. If the rate threshold is exceeded, open the circuit.
 */
export async function recordBounce(): Promise<void> {
  const state = await getOrCreateState();
  const updated = await prisma.sesCircuitBreakerState.update({
    where: { id: "singleton" },
    data: { totalBounced: { increment: 1 } },
  });

  if (
    updated.totalSent >= MIN_SENDS_BEFORE_CHECK &&
    updated.totalBounced / updated.totalSent > BOUNCE_RATE_THRESHOLD &&
    !state.isOpen
  ) {
    await openCircuit(
      `Bounce rate exceeded: ${updated.totalBounced}/${updated.totalSent} = ${(
        (updated.totalBounced / updated.totalSent) *
        100
      ).toFixed(2)}%`
    );
  }
}

/**
 * Record a complaint. If the rate threshold is exceeded, open the circuit.
 */
export async function recordComplaint(): Promise<void> {
  const state = await getOrCreateState();
  const updated = await prisma.sesCircuitBreakerState.update({
    where: { id: "singleton" },
    data: { totalComplained: { increment: 1 } },
  });

  if (
    updated.totalSent >= MIN_SENDS_BEFORE_CHECK &&
    updated.totalComplained / updated.totalSent > COMPLAINT_RATE_THRESHOLD &&
    !state.isOpen
  ) {
    await openCircuit(
      `Complaint rate exceeded: ${updated.totalComplained}/${updated.totalSent}`
    );
  }
}

/**
 * Open the circuit — stop all outbound sends. Pages on-call.
 */
export async function openCircuit(reason: string): Promise<void> {
  await prisma.sesCircuitBreakerState.update({
    where: { id: "singleton" },
    data: {
      isOpen: true,
      openedAt: new Date(),
      openReason: reason,
    },
  });
  logger.error(
    "SES CIRCUIT BREAKER OPENED — outbound portal invites blocked",
    new Error(reason)
  );
  // TODO: fire CloudWatch metric to page on-call (COND-21)
}

/**
 * Manual clear — for admin use after incident resolution.
 */
export async function closeCircuit(): Promise<void> {
  await prisma.sesCircuitBreakerState.update({
    where: { id: "singleton" },
    data: { isOpen: false, openedAt: null, openReason: null },
  });
  logger.info("SES circuit breaker manually closed");
}
