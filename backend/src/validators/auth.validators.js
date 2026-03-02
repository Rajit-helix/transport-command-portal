import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email().max(160),
    password: z.string().min(8),
    role: z.enum(["ADMIN", "TRANSPORT_MANAGER", "DRIVER", "CUSTOMER"]).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  }),
  params: z.object({}),
  query: z.object({})
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10)
  }),
  params: z.object({}),
  query: z.object({})
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email().max(160)
  }),
  params: z.object({}),
  query: z.object({})
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(20).max(256),
    newPassword: z.string().min(8).max(120)
  }),
  params: z.object({}),
  query: z.object({})
});
