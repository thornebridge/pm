import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { userThemes } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { BUILTIN_THEMES } from '$lib/server/theme/builtins.js';
import { validateTheme, themeToVariables } from '$lib/server/theme/parser.js';

/** GET — list all themes (builtins + user's custom) */
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const custom = db
		.select()
		.from(userThemes)
		.where(eq(userThemes.userId, user.id))
		.all()
		.map((t) => ({
			id: t.id,
			name: t.name,
			description: t.description,
			variables: JSON.parse(t.variables),
			builtin: false
		}));

	const builtins = BUILTIN_THEMES.map((t) => ({
		id: t.id,
		name: t.name,
		description: t.description,
		variables: t.variables,
		builtin: true
	}));

	return json([...builtins, ...custom]);
};

/** POST — import a .pmtheme from source markdown */
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (!body.source || typeof body.source !== 'string') {
		return json({ error: 'Missing .pmtheme source' }, { status: 400 });
	}

	const result = validateTheme(body.source);
	if (!result.valid || !result.theme) {
		return json({ error: 'Invalid theme', details: result.errors }, { status: 400 });
	}

	const variables = themeToVariables(result.theme);
	const now = Date.now();
	const id = nanoid(12);

	db.insert(userThemes)
		.values({
			id,
			userId: user.id,
			name: result.theme.name,
			description: result.theme.description || '',
			source: body.source,
			variables: JSON.stringify(variables),
			createdAt: now,
			updatedAt: now
		})
		.run();

	return json({ id, name: result.theme.name, variables, builtin: false }, { status: 201 });
};
