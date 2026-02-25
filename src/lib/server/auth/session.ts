import { db } from '../db/index.js';
import { sessions, users } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { getRedis, isRedisConnected } from '../redis/index.js';
import type { Role } from '$lib/config/workspaces';

const SESSION_COOKIE = 'pm_session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const REDIS_SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

function generateSessionId(): string {
	return crypto.randomBytes(20).toString('hex'); // 40 chars
}

interface SessionData {
	sessionId: string;
	expiresAt: number;
	user: { id: string; email: string; name: string; role: Role };
}

export async function createSession(userId: string): Promise<string> {
	const id = generateSessionId();
	const now = Date.now();

	await db.insert(sessions)
		.values({
			id,
			userId,
			expiresAt: now + SESSION_MAX_AGE,
			createdAt: now
		});

	// Cache in Redis
	if (isRedisConnected()) {
		const redis = getRedis();
		if (redis) {
			const [userRow] = await db
				.select({ id: users.id, email: users.email, name: users.name, role: users.role })
				.from(users)
				.where(eq(users.id, userId));
			if (userRow) {
				const data: SessionData = {
					sessionId: id,
					expiresAt: now + SESSION_MAX_AGE,
					user: { id: userRow.id, email: userRow.email, name: userRow.name, role: userRow.role as Role }
				};
				await redis.set(`session:${id}`, JSON.stringify(data), 'EX', REDIS_SESSION_TTL).catch(() => {});
			}
		}
	}

	return id;
}

export async function validateSession(sessionId: string) {
	const now = Date.now();

	// Try Redis cache first
	if (isRedisConnected()) {
		const redis = getRedis();
		if (redis) {
			try {
				const cached = await redis.get(`session:${sessionId}`);
				if (cached) {
					const data: SessionData = JSON.parse(cached);
					if (data.expiresAt > now) {
						// Rolling expiry: refresh if less than 15 days remaining
						if (data.expiresAt - now < SESSION_MAX_AGE / 2) {
							const newExpiry = now + SESSION_MAX_AGE;
							data.expiresAt = newExpiry;
							await Promise.all([
								db.update(sessions).set({ expiresAt: newExpiry }).where(eq(sessions.id, sessionId)),
								redis.set(`session:${sessionId}`, JSON.stringify(data), 'EX', REDIS_SESSION_TTL)
							]).catch(() => {});
						}
						return { sessionId: data.sessionId, user: data.user };
					}
					// Expired — clean up
					await redis.del(`session:${sessionId}`).catch(() => {});
				}
			} catch {
				// Fall through to PostgreSQL
			}
		}
	}

	// PostgreSQL fallback
	const [result] = await db
		.select({
			sessionId: sessions.id,
			expiresAt: sessions.expiresAt,
			userId: users.id,
			email: users.email,
			name: users.name,
			role: users.role
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)));

	if (!result) return null;

	// Rolling expiry: extend if less than 15 days remaining
	if (result.expiresAt - now < SESSION_MAX_AGE / 2) {
		await db.update(sessions)
			.set({ expiresAt: now + SESSION_MAX_AGE })
			.where(eq(sessions.id, sessionId));
	}

	const sessionData: SessionData = {
		sessionId: result.sessionId,
		expiresAt: result.expiresAt,
		user: {
			id: result.userId,
			email: result.email,
			name: result.name,
			role: result.role as Role
		}
	};

	// Re-cache in Redis
	if (isRedisConnected()) {
		const redis = getRedis();
		if (redis) {
			await redis.set(`session:${sessionId}`, JSON.stringify(sessionData), 'EX', REDIS_SESSION_TTL).catch(() => {});
		}
	}

	return { sessionId: sessionData.sessionId, user: sessionData.user };
}

export async function deleteSession(sessionId: string) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
	if (isRedisConnected()) {
		const redis = getRedis();
		if (redis) await redis.del(`session:${sessionId}`).catch(() => {});
	}
}

export async function deleteUserSessions(userId: string) {
	// Get all session IDs for this user to clear from Redis
	if (isRedisConnected()) {
		const redis = getRedis();
		if (redis) {
			const userSessions = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
			const pipeline = redis.pipeline();
			for (const s of userSessions) {
				pipeline.del(`session:${s.id}`);
			}
			await pipeline.exec().catch(() => {});
		}
	}
	await db.delete(sessions).where(eq(sessions.userId, userId));
}

export function setSessionCookie(cookies: Cookies, sessionId: string) {
	cookies.set(SESSION_COOKIE, sessionId, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: SESSION_MAX_AGE / 1000
	});
}

export function getSessionCookie(cookies: Cookies): string | undefined {
	return cookies.get(SESSION_COOKIE);
}

export function deleteSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
