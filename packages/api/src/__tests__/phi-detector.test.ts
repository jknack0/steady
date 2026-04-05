import { describe, it, expect } from "vitest";
import { detectPhi, assertNoPhi, PhiDetectedError } from "../lib/phi-detector";

// Tests use local fallback (sidecar not running in test environment)

describe("PHI Detector", () => {
  describe("detectPhi", () => {
    it("detects SSN patterns", async () => {
      expect((await detectPhi("SSN: 123-45-6789")).found).toBe(true);
      expect((await detectPhi("123456789 is the number")).found).toBe(true);
    });

    it("detects phone numbers", async () => {
      expect((await detectPhi("Call (555) 123-4567")).found).toBe(true);
      expect((await detectPhi("Phone: 555-123-4567")).found).toBe(true);
    });

    it("detects DOB labels", async () => {
      expect((await detectPhi("DOB: 01/15/1990")).found).toBe(true);
      expect((await detectPhi("Date of Birth: 03/22/1985")).found).toBe(true);
    });

    it("detects email addresses", async () => {
      expect((await detectPhi("Contact jane.doe@example.com")).found).toBe(true);
    });

    it("detects MRN patterns", async () => {
      expect((await detectPhi("MRN: 12345678")).found).toBe(true);
      expect((await detectPhi("Patient ID: ABC123")).found).toBe(true);
    });

    it("detects patient/client name labels", async () => {
      expect((await detectPhi("Patient: John Smith")).found).toBe(true);
      expect((await detectPhi("Client Name: Jane Doe")).found).toBe(true);
    });

    it("detects street addresses", async () => {
      expect((await detectPhi("Lives at 123 Main Street")).found).toBe(true);
    });

    it("detects insurance IDs", async () => {
      expect((await detectPhi("Policy # ABC123456")).found).toBe(true);
    });

    it("allows clean clinical content", async () => {
      expect((await detectPhi("Practice deep breathing for 5 minutes daily")).found).toBe(false);
      expect((await detectPhi("Rate your anxiety on a scale of 1-10")).found).toBe(false);
      expect((await detectPhi("Complete the thought record worksheet")).found).toBe(false);
      expect((await detectPhi("Session 3: Cognitive Restructuring Techniques")).found).toBe(false);
    });

    it("allows generic clinical terms", async () => {
      expect((await detectPhi("ADHD medication management")).found).toBe(false);
      expect((await detectPhi("CBT for depression and anxiety")).found).toBe(false);
    });

    it("handles empty/null input", async () => {
      expect((await detectPhi("")).found).toBe(false);
      expect((await detectPhi(null as any)).found).toBe(false);
    });
  });

  describe("assertNoPhi", () => {
    it("does not throw for clean content", async () => {
      await expect(assertNoPhi("Practice mindfulness daily", "test")).resolves.not.toThrow();
    });

    it("throws PhiDetectedError for PHI content", async () => {
      await expect(assertNoPhi("Patient: John Smith, DOB: 01/15/1990", "test"))
        .rejects.toThrow(PhiDetectedError);
    });

    it("error message is user-friendly", async () => {
      try {
        await assertNoPhi("SSN: 123-45-6789", "test");
      } catch (err) {
        expect((err as Error).message).toContain("protected health information");
        expect((err as Error).message).toContain("remove personal identifiers");
      }
    });
  });
});
