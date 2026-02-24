import { db } from '../db/index.js';
import { inviteTokens } from '../db/schema.js';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import crypto from 'node:crypto';

const INVITE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createInvite(createdBy: string, role: 'admin' | 'member' = 'member', email?: string) {
	const now = Date.now();
	const invite = {
		id: nanoid(12),
		token: crypto.randomBytes(16).toString('hex'), // 32 chars
		email: email || null,
		role,
		createdBy,
		expiresAt: now + INVITE_EXPIRY,
		createdAt: now
	};

	await db.insert(inviteTokens).values(invite);
	return invite;
}

export async function validateInvite(token: string) {
	const now = Date.now();

	const [result] = await db
		.select()
		.from(inviteTokens)
		.where(and(eq(inviteTokens.token, token), isNull(inviteTokens.usedAt), gt(inviteTokens.expiresAt, now)));

	return result;
}

export async function markInviteUsed(tokenId: string, usedBy: string) {
	await db.update(inviteTokens)
		.set({ usedBy, usedAt: Date.now() })
		.where(eq(inviteTokens.id, tokenId));
}

export async function listInvites() {
	return await db.select().from(inviteTokens).orderBy(inviteTokens.createdAt);
}

export async function deleteInvite(id: string) {
	await db.delete(inviteTokens).where(eq(inviteTokens.id, id));
}
