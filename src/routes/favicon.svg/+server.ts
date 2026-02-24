import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { users, userThemes } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getBuiltinTheme } from '$lib/server/theme/builtins.js';
import { getSessionCookie, validateSession } from '$lib/server/auth/session.js';

export const GET: RequestHandler = async (event) => {
	let brandColor = '#3d7a5c'; // Forest brand-500 default

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
					brandColor = builtin.variables['--color-brand-500'] || brandColor;
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
						brandColor = vars['--color-brand-500'] || brandColor;
					}
				}
			}
		}
	}

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${brandColor}"/>
  <text x="16" y="22" text-anchor="middle" font-family="system-ui" font-weight="700" font-size="16" fill="white">P</text>
</svg>`;

	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'no-cache, no-store'
		}
	});
};
