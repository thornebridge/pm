import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const result = db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			role: users.role
		})
		.from(users)
		.all();

	return json(result);
};
