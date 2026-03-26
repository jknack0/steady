import { describe, it, expect, beforeEach } from "vitest";

// Import directly from db package source for testing
import { encryptField, decryptField, _resetKeyCache } from "../../../db/src/crypto";

beforeEach(() => {
  _resetKeyCache();
});

describe("Field-level encryption (AES-256-GCM)", () => {
  it("encrypts and decrypts a string round-trip", () => {
    const plaintext = "123456789";
    const encrypted = encryptField(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.startsWith("enc:")).toBe(true);
    expect(decryptField(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertext for the same input (random IV)", () => {
    const plaintext = "1234567890";
    const enc1 = encryptField(plaintext);
    const enc2 = encryptField(plaintext);
    expect(enc1).not.toBe(enc2);
    // Both still decrypt to the same value
    expect(decryptField(enc1)).toBe(plaintext);
    expect(decryptField(enc2)).toBe(plaintext);
  });

  it("handles empty string", () => {
    const encrypted = encryptField("");
    expect(decryptField(encrypted)).toBe("");
  });

  it("handles long values", () => {
    const plaintext = "A".repeat(10000);
    const encrypted = encryptField(plaintext);
    expect(decryptField(encrypted)).toBe(plaintext);
  });

  it("handles unicode characters", () => {
    const plaintext = "NPI: 日本語テスト 🏥";
    const encrypted = encryptField(plaintext);
    expect(decryptField(encrypted)).toBe(plaintext);
  });

  it("passes through plaintext values without enc: prefix (migration support)", () => {
    expect(decryptField("1234567890")).toBe("1234567890");
    expect(decryptField("some-old-npi")).toBe("some-old-npi");
  });

  it("throws on malformed encrypted value", () => {
    expect(() => decryptField("enc:bad")).toThrow("Malformed encrypted field value");
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptField("secret");
    // Tamper with the ciphertext portion
    const parts = encrypted.split(":");
    parts[3] = "AAAA" + parts[3].slice(4);
    const tampered = parts.join(":");
    expect(() => decryptField(tampered)).toThrow();
  });
});
