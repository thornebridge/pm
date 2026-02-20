import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { userThemes, users } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getBuiltinTheme } from '$lib/server/theme/builtins.js';

/** GET — export a theme's .pmtheme source */
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { themeId } = event.params;

	// Check builtins first
	const builtin = getBuiltinTheme(themeId);
	if (builtin) {
		return json({ source: builtin.source });
	}

	const theme = db
		.select()
		.from(userThemes)
		.where(and(eq(userThemes.id, themeId), eq(userThemes.userId, user.id)))
		.get();

	if (!theme) {
		return json({ error: 'Theme not found' }, { status: 404 });
	}

	return json({ source: theme.source });
};

/** DELETE — remove a custom theme */
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { themeId } = event.params;

	// Can't delete builtins
	if (getBuiltinTheme(themeId)) {
		return json({ error: 'Cannot delete built-in theme' }, { status: 400 });
	}

	const theme = db
		.select()
		.from(userThemes)
		.where(and(eq(userThemes.id, themeId), eq(userThemes.userId, user.id)))
		.get();

	if (!theme) {
		return json({ error: 'Theme not found' }, { status: 404 });
	}

	// If this was the active theme, clear it
	db.update(users)
		.set({ activeThemeId: null })
		.where(and(eq(users.id, user.id), eq(users.activeThemeId, themeId)))
		.run();

	db.delete(userThemes)
		.where(eq(userThemes.id, themeId))
		.run();

	return json({ ok: true });
};
