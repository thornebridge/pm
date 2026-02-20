import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { users, userThemes } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getBuiltinTheme } from '$lib/server/theme/builtins.js';

/** PUT — set user's active theme */
export const PUT: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const themeId: string | null = body.themeId ?? null;

	// Validate theme exists
	if (themeId) {
		const builtin = getBuiltinTheme(themeId);
		if (!builtin) {
			const custom = db
				.select()
				.from(userThemes)
				.where(and(eq(userThemes.id, themeId), eq(userThemes.userId, user.id)))
				.get();

			if (!custom) {
				return json({ error: 'Theme not found' }, { status: 404 });
			}
		}
	}

	db.update(users)
		.set({ activeThemeId: themeId })
		.where(eq(users.id, user.id))
		.run();

	return json({ ok: true });
};
