import { db } from '../db/index.js';
import { sessions, users } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE = 'pm_session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateSessionId(): string {
	return crypto.randomBytes(20).toString('hex'); // 40 chars
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

	return id;
}

export async function validateSession(sessionId: string) {
	const now = Date.now();

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

	return {
		sessionId: result.sessionId,
		user: {
			id: result.userId,
			email: result.email,
			name: result.name,
			role: result.role as 'admin' | 'member'
		}
	};
}

export async function deleteSession(sessionId: string) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteUserSessions(userId: string) {
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
