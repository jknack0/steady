import { describe, it, expect } from "vitest";
import { detectPhi, assertNoPhi, PhiDetectedError } from "../lib/phi-detector";

describe("PHI Detector", () => {
  describe("detectPhi", () => {
    it("detects SSN patterns", () => {
      expect(detectPhi("SSN: 123-45-6789").found).toBe(true);
      expect(detectPhi("123456789 is the number").found).toBe(true);
    });

    it("detects phone numbers", () => {
      expect(detectPhi("Call (555) 123-4567").found).toBe(true);
      expect(detectPhi("Phone: 555-123-4567").found).toBe(true);
      expect(detectPhi("555.123.4567").found).toBe(true);
    });

    it("detects DOB labels", () => {
      expect(detectPhi("DOB: 01/15/1990").found).toBe(true);
      expect(detectPhi("Date of Birth: 03/22/1985").found).toBe(true);
      expect(detectPhi("born 1990").found).toBe(true);
    });

    it("detects email addresses", () => {
      expect(detectPhi("Contact jane.doe@example.com for info").found).toBe(true);
    });

    it("detects MRN patterns", () => {
      expect(detectPhi("MRN: 12345678").found).toBe(true);
      expect(detectPhi("Patient ID: ABC123").found).toBe(true);
      expect(detectPhi("Chart #98765").found).toBe(true);
    });

    it("detects patient/client name labels", () => {
      expect(detectPhi("Patient: John Smith").found).toBe(true);
      expect(detectPhi("Client Name: Jane Doe").found).toBe(true);
    });

    it("detects street addresses", () => {
      expect(detectPhi("Lives at 123 Main Street").found).toBe(true);
      expect(detectPhi("456 Oak Avenue, Suite 2").found).toBe(true);
    });

    it("detects insurance IDs", () => {
      expect(detectPhi("Policy # ABC123456").found).toBe(true);
      expect(detectPhi("Insurance ID: XYZ-789-012").found).toBe(true);
    });

    // Clean clinical content should pass
    it("allows clean clinical content", () => {
      expect(detectPhi("Practice deep breathing for 5 minutes daily").found).toBe(false);
      expect(detectPhi("Rate your anxiety on a scale of 1-10").found).toBe(false);
      expect(detectPhi("Complete the thought record worksheet").found).toBe(false);
      expect(detectPhi("Session 3: Cognitive Restructuring Techniques").found).toBe(false);
      expect(detectPhi("Homework: Identify 3 automatic thoughts this week").found).toBe(false);
    });

    it("allows generic clinical terms", () => {
      expect(detectPhi("ADHD medication management").found).toBe(false);
      expect(detectPhi("CBT for depression and anxiety").found).toBe(false);
      expect(detectPhi("Module 1: Understanding Your ADHD Brain").found).toBe(false);
    });

    it("handles empty/null input", () => {
      expect(detectPhi("").found).toBe(false);
      expect(detectPhi(null as any).found).toBe(false);
      expect(detectPhi(undefined as any).found).toBe(false);
    });
  });

  describe("assertNoPhi", () => {
    it("does not throw for clean content", () => {
      expect(() => assertNoPhi("Practice mindfulness daily", "test")).not.toThrow();
    });

    it("throws PhiDetectedError for PHI content", () => {
      expect(() => assertNoPhi("Patient: John Smith, DOB: 01/15/1990", "test"))
        .toThrow(PhiDetectedError);
    });

    it("includes detected types in error", () => {
      try {
        assertNoPhi("Patient: John Smith", "test");
      } catch (err) {
        expect(err).toBeInstanceOf(PhiDetectedError);
        expect((err as PhiDetectedError).detectedTypes).toContain("Patient/client name");
      }
    });

    it("error message is user-friendly", () => {
      try {
        assertNoPhi("SSN: 123-45-6789", "test");
      } catch (err) {
        expect((err as Error).message).toContain("protected health information");
        expect((err as Error).message).toContain("remove personal identifiers");
      }
    });
  });
});
