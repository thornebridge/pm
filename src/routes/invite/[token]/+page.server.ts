import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { validateInvite, markInviteUsed } from '$lib/server/auth/invite.js';
import { hashPassword } from '$lib/server/auth/password.js';
import { createSession, setSessionCookie } from '$lib/server/auth/session.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ params }) => {
	const invite = validateInvite(params.token);

	if (!invite) {
		return { valid: false as const };
	}

	return {
		valid: true as const,
		email: invite.email,
		role: invite.role
	};
};

export const actions: Actions = {
	default: async ({ request, params, cookies }) => {
		const invite = validateInvite(params.token);
		if (!invite) {
			return fail(400, { error: 'Invalid or expired invite' });
		}

		const form = await request.formData();
		const name = form.get('name')?.toString().trim();
		const email = form.get('email')?.toString().trim().toLowerCase();
		const password = form.get('password')?.toString();

		if (!name || !email || !password) {
			return fail(400, { error: 'All fields are required', name, email });
		}

		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters', name, email });
		}

		// If invite has a fixed email, enforce it
		if (invite.email && invite.email !== email) {
			return fail(400, { error: 'Email does not match invite', name, email });
		}

		// Check if email already in use
		const existing = db.select().from(users).where(eq(users.email, email)).get();
		if (existing) {
			return fail(400, { error: 'Email already in use', name, email });
		}

		const now = Date.now();
		const userId = nanoid(12);
		const hash = await hashPassword(password);

		db.insert(users)
			.values({
				id: userId,
				email,
				name,
				passwordHash: hash,
				role: invite.role as 'admin' | 'member',
				createdAt: now,
				updatedAt: now
			})
			.run();

		markInviteUsed(invite.id, userId);

		const sessionId = createSession(userId);
		setSessionCookie(cookies, sessionId);

		throw redirect(302, '/projects');
	}
};
