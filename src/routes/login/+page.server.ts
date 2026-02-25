import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyPassword } from '$lib/server/auth/password.js';
import { createSession, setSessionCookie } from '$lib/server/auth/session.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { ROLE_DEFAULT_ROUTE, type Role } from '$lib/config/workspaces';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, ROLE_DEFAULT_ROUTE[locals.user.role] || '/dashboard');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = form.get('email')?.toString().trim().toLowerCase();
		const password = form.get('password')?.toString();

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required', email });
		}

		const [user] = await db.select().from(users).where(eq(users.email, email));

		if (!user || !(await verifyPassword(user.passwordHash, password))) {
			return fail(400, { error: 'Invalid email or password', email });
		}

		const sessionId = await createSession(user.id);
		setSessionCookie(cookies, sessionId);

		throw redirect(302, ROLE_DEFAULT_ROUTE[user.role as Role] || '/dashboard');
	}
};
