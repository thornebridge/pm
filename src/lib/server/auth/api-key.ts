import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { apiKeys, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { Role } from '$lib/config/workspaces';

const PREFIX = 'pm_';

function hashKey(key: string): string {
	return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): { id: string; key: string; hash: string; prefix: string } {
	const id = nanoid(12);
	const raw = nanoid(32);
	const key = `${PREFIX}${raw}`;
	const hash = hashKey(key);
	const prefix = key.slice(0, 8);
	return { id, key, hash, prefix };
}

export async function validateApiKey(
	key: string
): Promise<{ id: string; email: string; name: string; role: Role } | null> {
	if (!key.startsWith(PREFIX)) return null;

	const hash = hashKey(key);

	const rows = await db
		.select({
			keyId: apiKeys.id,
			userId: users.id,
			email: users.email,
			name: users.name,
			role: users.role
		})
		.from(apiKeys)
		.innerJoin(users, eq(apiKeys.userId, users.id))
		.where(eq(apiKeys.keyHash, hash))
		.limit(1);

	if (rows.length === 0) return null;

	const row = rows[0];

	// Update lastUsedAt (fire-and-forget)
	db.update(apiKeys)
		.set({ lastUsedAt: Date.now() })
		.where(eq(apiKeys.id, row.keyId))
		.catch(() => {});

	return { id: row.userId, email: row.email, name: row.name, role: row.role as Role };
}
