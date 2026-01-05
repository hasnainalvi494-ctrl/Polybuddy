import type { FastifyRequest, FastifyReply } from "fastify";
import { db, sessions } from "@polybuddy/db";
import { eq } from "drizzle-orm";

const SESSION_COOKIE = "polybuddy_session";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export async function getAuthUser(request: FastifyRequest): Promise<AuthUser | null> {
  const token = request.cookies[SESSION_COOKIE];

  if (!token) {
    return null;
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
    with: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthUser | null> {
  const user = await getAuthUser(request);

  if (!user) {
    reply.status(401).send({ error: "Not authenticated" });
    return null;
  }

  return user;
}
