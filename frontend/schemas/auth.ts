import { z } from "zod";
import { normalizeEmail, normalizeName } from "@/utils/sanitize";

const passwordSchema = z
  .string()
  .trim()
  .min(12, "Password must be at least 12 characters.")
  .max(128, "Password is too long.")
  .regex(/[a-z]/, "Password needs one lowercase letter.")
  .regex(/[A-Z]/, "Password needs one uppercase letter.")
  .regex(/[0-9]/, "Password needs one number.")
  .regex(/[^A-Za-z0-9]/, "Password needs one special character.");

const emailSchema = z
  .string()
  .trim()
  .max(254, "Email is too long.")
  .email("Enter a valid email address.")
  .transform(normalizeEmail);

const loginIdentifierSchema = z
  .string()
  .trim()
  .min(1, "Email or phone number is required.")
  .max(254, "Input is too long.")
  .refine(
    (val) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const isPhone = /^[\d\s+\-()]{6,25}$/.test(val);
      return isEmail || isPhone;
    },
    {
      message: "Enter a valid email address or phone number.",
    },
  )
  .transform((val) => (val.includes("@") ? normalizeEmail(val) : val.trim()));

export const loginSchema = z.object({
  email: loginIdentifierSchema,
  password: z.string().min(1, "Password is required.").max(1024, "Password is too long."),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .max(120, "Full name is too long.")
      .regex(
        /^[\p{L}\p{M}\p{N}\s.'-]+$/u,
        "Use letters, numbers, spaces, apostrophes, hyphens, and periods only.",
      )
      .transform(normalizeName),
    email: emailSchema,
    password: passwordSchema,
    password_confirmation: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match.",
    path: ["password_confirmation"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    token: z
      .string()
      .trim()
      .min(20, "Invalid reset link.")
      .max(512, "Invalid reset link."),
    password: passwordSchema,
    password_confirmation: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match.",
    path: ["password_confirmation"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
