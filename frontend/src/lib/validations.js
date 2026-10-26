import { z } from "zod";

/**
 * Zod Schemas matching Django backend validation rules
 */

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(150, "Username must be at most 150 characters"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(150, "Username must be at most 150 characters")
    .regex(/^[\w.@+-]+$/, "Letters, digits and @/./+/-/_ only."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long"),
  confirmPassword: z
    .string()
    .min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const workspaceCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Workspace name is required")
    .max(50, "Workspace name must be at most 50 characters")
    .refine((val) => val.trim().length > 0, "Workspace name cannot be only whitespace"),
});

export const inviteCreateSchema = z.object({
  expires_at: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        const now = new Date();
        const maxFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        return d > now && d <= maxFuture;
      },
      "Expiry date must be in the future and within 30 days."
    ),
  max_uses: z.coerce
    .number()
    .min(1, "Maximum uses must be at least 1")
    .max(100, "Maximum uses cannot exceed 100")
    .default(1),
});

export const askQuestionSchema = z.object({
  question: z
    .string()
    .min(2, "Please enter a question with at least 2 characters")
    .max(1000, "Question is too long"),
});
