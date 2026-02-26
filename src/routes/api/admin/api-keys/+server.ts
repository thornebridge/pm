import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { generateApiKey } from '$lib/server/auth/api-key.js';
import { db } from '$lib/server/db/index.js';
import { apiKeys, users } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	requireAdmin(event);

	const keys = await db
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			keyPrefix: apiKeys.keyPrefix,
			userId: apiKeys.userId,
			userName: users.name,
			lastUsedAt: apiKeys.lastUsedAt,
			createdAt: apiKeys.createdAt
		})
		.from(apiKeys)
		.innerJoin(users, eq(apiKeys.userId, users.id))
		.orderBy(desc(apiKeys.createdAt));

	return json(keys);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { name, userId } = await event.request.json();

	if (!name?.trim()) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const targetUserId = userId || user.id;
	const { id, key, hash, prefix } = generateApiKey();

	await db.insert(apiKeys).values({
		id,
		name: name.trim(),
		keyHash: hash,
		keyPrefix: prefix,
		userId: targetUserId,
		createdAt: Date.now()
	});

	return json({ id, name: name.trim(), key, keyPrefix: prefix });
};
