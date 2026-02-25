import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { userThemes, users } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getBuiltinTheme } from '$lib/server/theme/builtins.js';
import { validateTheme, themeToVariables } from '$lib/server/theme/parser.js';

/** GET — export a theme's .pmtheme source */
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { themeId } = event.params;

	// Check builtins first
	const builtin = getBuiltinTheme(themeId);
	if (builtin) {
		return json({ source: builtin.source });
	}

	const [theme] = await db
		.select()
		.from(userThemes)
		.where(and(eq(userThemes.id, themeId), eq(userThemes.userId, user.id)));

	if (!theme) {
		return json({ error: 'Theme not found' }, { status: 404 });
	}

	return json({ source: theme.source });
};

/** PUT — update a custom theme */
export const PUT: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { themeId } = event.params;
	const body = await event.request.json();

	// Can't update builtins
	if (getBuiltinTheme(themeId)) {
		return json({ error: 'Cannot update built-in theme' }, { status: 400 });
	}

	if (!body.source || typeof body.source !== 'string') {
		return json({ error: 'Missing .pmtheme source' }, { status: 400 });
	}

	const result = validateTheme(body.source);
	if (!result.valid || !result.theme) {
		return json({ error: 'Invalid theme', details: result.errors }, { status: 400 });
	}

	// Verify ownership
	const [existing] = await db
		.select()
		.from(userThemes)
		.where(and(eq(userThemes.id, themeId), eq(userThemes.userId, user.id)));

	if (!existing) {
		return json({ error: 'Theme not found' }, { status: 404 });
	}

	const variables = themeToVariables(result.theme);

	await db.update(userThemes)
		.set({
			name: result.theme.name,
			description: result.theme.description || '',
			source: body.source,
			variables: JSON.stringify(variables),
			updatedAt: Date.now()
		})
		.where(eq(userThemes.id, themeId));

	return json({ id: themeId, name: result.theme.name, variables, builtin: false });
};

/** DELETE — remove a custom theme */
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { themeId } = event.params;

	// Can't delete builtins
	if (getBuiltinTheme(themeId)) {
		return json({ error: 'Cannot delete built-in theme' }, { status: 400 });
	}

	const [theme] = await db
		.select()
		.from(userThemes)
		.where(and(eq(userThemes.id, themeId), eq(userThemes.userId, user.id)));

	if (!theme) {
		return json({ error: 'Theme not found' }, { status: 404 });
	}

	// If this was the active theme, clear it
	await db.update(users)
		.set({ activeThemeId: null })
		.where(and(eq(users.id, user.id), eq(users.activeThemeId, themeId)));

	await db.delete(userThemes)
		.where(eq(userThemes.id, themeId));

	return json({ ok: true });
};
