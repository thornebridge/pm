import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { users, userThemes } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getBuiltinTheme, BUILTIN_THEMES } from '$lib/server/theme/builtins.js';
import { getSessionCookie, validateSession } from '$lib/server/auth/session.js';

export const GET: RequestHandler = async (event) => {
	let themeColor = '#2d4f3e';
	let bgColor = '#1c1917';

	const sessionId = getSessionCookie(event.cookies);
	if (sessionId) {
		const result = await validateSession(sessionId);
		if (result) {
			const [userRow] = await db
				.select({ activeThemeId: users.activeThemeId })
				.from(users)
				.where(eq(users.id, result.user.id));

			if (userRow?.activeThemeId) {
				const builtin = getBuiltinTheme(userRow.activeThemeId);
				if (builtin) {
					themeColor = builtin.variables['--color-brand-600'] || themeColor;
					bgColor = builtin.variables['--color-surface-900'] || bgColor;
				} else {
					const [custom] = await db
						.select({ variables: userThemes.variables })
						.from(userThemes)
						.where(and(
							eq(userThemes.id, userRow.activeThemeId),
							eq(userThemes.userId, result.user.id)
						));
					if (custom) {
						const vars = JSON.parse(custom.variables);
						themeColor = vars['--color-brand-600'] || themeColor;
						bgColor = vars['--color-surface-900'] || bgColor;
					}
				}
			}
		}
	}

	const manifest = {
		name: 'PM',
		short_name: 'PM',
		start_url: '/',
		display: 'standalone',
		background_color: bgColor,
		theme_color: themeColor,
		icons: [
			{
				src: '/favicon.svg',
				sizes: 'any',
				type: 'image/svg+xml'
			}
		]
	};

	return new Response(JSON.stringify(manifest), {
		headers: {
			'Content-Type': 'application/manifest+json',
			'Cache-Control': 'no-cache, no-store'
		}
	});
};
