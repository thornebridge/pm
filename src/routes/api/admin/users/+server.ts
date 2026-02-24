import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	requireAdmin(event);

	const result = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			role: users.role,
			createdAt: users.createdAt
		})
		.from(users)
		.orderBy(users.createdAt);

	return json(result);
};
