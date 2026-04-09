import { z } from "zod";

export const CreateInvitationSchema = z.object({
  patientName: z.string().min(1, "Patient name is required").max(200),
  patientEmail: z.string().email("Invalid email address").max(200),
  programId: z.string().optional(),
  sendEmail: z.boolean().default(false),
});

export const RegisterWithInviteSchema = z.object({
  inviteCode: z
    .string()
    .min(1, "Invite code is required")
    .transform((val) => val.toUpperCase())
    .pipe(
      z
        .string()
        .regex(
          /^STEADY-[A-Z0-9]{4}$/,
          "Invalid invite code format. Expected STEADY-XXXX."
        )
    ),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;
export type RegisterWithInviteInput = z.infer<typeof RegisterWithInviteSchema>;
