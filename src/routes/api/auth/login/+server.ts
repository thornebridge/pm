import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyPassword } from '$lib/server/auth/password.js';
import { createSession, setSessionCookie } from '$lib/server/auth/session.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { email, password } = await request.json();

	if (!email || !password) {
		return json({ error: 'Email and password are required' }, { status: 400 });
	}

	const user = db
		.select()
		.from(users)
		.where(eq(users.email, email.trim().toLowerCase()))
		.get();

	if (!user || !(await verifyPassword(user.passwordHash, password))) {
		return json({ error: 'Invalid email or password' }, { status: 400 });
	}

	const sessionId = createSession(user.id);
	setSessionCookie(cookies, sessionId);

	return json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
};
