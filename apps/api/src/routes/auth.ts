import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, users, sessions } from "@polybuddy/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SESSION_COOKIE = "polybuddy_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Rate limit config for auth endpoints (stricter than global)
const AUTH_RATE_LIMIT = {
  max: 5, // 5 attempts per minute
  timeWindow: "1 minute",
  errorResponseBuilder: () => ({
    error: "Too many login attempts. Please try again later.",
  }),
};

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
});

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Signup (rate limited to prevent abuse)
  typedApp.post(
    "/signup",
    {
      config: {
        rateLimit: AUTH_RATE_LIMIT,
      },
      schema: {
        body: SignupSchema,
        response: {
          201: UserSchema,
          409: z.object({ error: z.string() }),
          429: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, password, name } = request.body;

      // Check if user exists
      const existing = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });

      if (existing) {
        return reply.status(409).send({ error: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          passwordHash,
          name: name ?? null,
        })
        .returning();

      // Create session
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

      await db.insert(sessions).values({
        userId: newUser!.id,
        token,
        expiresAt,
      });

      // Set cookie
      reply.setCookie(SESSION_COOKIE, token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION_MS / 1000,
      });

      return reply.status(201).send({
        id: newUser!.id,
        email: newUser!.email,
        name: newUser!.name,
      });
    }
  );

  // Login (rate limited to prevent brute force)
  typedApp.post(
    "/login",
    {
      config: {
        rateLimit: AUTH_RATE_LIMIT,
      },
      schema: {
        body: LoginSchema,
        response: {
          200: UserSchema,
          401: z.object({ error: z.string() }),
          429: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });

      if (!user) {
        return reply.status(401).send({ error: "Invalid email or password" });
      }

      // Check password
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({ error: "Invalid email or password" });
      }

      // Create session
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt,
      });

      // Set cookie
      reply.setCookie(SESSION_COOKIE, token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION_MS / 1000,
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    }
  );

  // Logout
  typedApp.post(
    "/logout",
    {
      schema: {
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request, reply) => {
      const token = request.cookies[SESSION_COOKIE];

      if (token) {
        // Delete session
        await db.delete(sessions).where(eq(sessions.token, token));
      }

      // Clear cookie
      reply.clearCookie(SESSION_COOKIE, { path: "/" });

      return { success: true };
    }
  );

  // Get current user
  typedApp.get(
    "/me",
    {
      schema: {
        response: {
          200: UserSchema,
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const token = request.cookies[SESSION_COOKIE];

      if (!token) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      // Find session
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.token, token),
        with: { user: true },
      });

      if (!session || session.expiresAt < new Date()) {
        // Clear expired/invalid cookie
        reply.clearCookie(SESSION_COOKIE, { path: "/" });
        return reply.status(401).send({ error: "Session expired" });
      }

      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      };
    }
  );
};
