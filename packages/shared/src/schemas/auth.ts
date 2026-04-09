import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  role: z.enum(["CLINICIAN", "PARTICIPANT"]).default("CLINICIAN"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const ConfirmResetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().min(1, "Verification code is required").max(20),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type RegisterInput = z.input<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ConfirmResetPasswordInput = z.infer<typeof ConfirmResetPasswordSchema>;
