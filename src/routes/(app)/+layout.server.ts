import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { folders, projects, users, userThemes, orgSettings } from '$lib/server/db/schema.js';
import { desc, eq, and } from 'drizzle-orm';
import { getBuiltinTheme, BUILTIN_THEMES } from '$lib/server/theme/builtins.js';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const allFolders = db.select().from(folders).orderBy(folders.position).all();
	const allProjects = db
		.select({
			id: projects.id,
			name: projects.name,
			slug: projects.slug,
			color: projects.color,
			folderId: projects.folderId,
			archived: projects.archived
		})
		.from(projects)
		.orderBy(desc(projects.updatedAt))
		.all();

	// Sidebar only shows non-archived projects
	const sidebarProjects = allProjects.filter((p) => !p.archived);

	// Load user's active theme
	let themeVariables: Record<string, string> | null = null;
	let themeMode: 'dark' | 'light' = 'dark';

	const userRow = db
		.select({ activeThemeId: users.activeThemeId })
		.from(users)
		.where(eq(users.id, locals.user.id))
		.get();

	const activeThemeId = userRow?.activeThemeId;

	if (activeThemeId) {
		// Check builtins
		const builtin = getBuiltinTheme(activeThemeId);
		if (builtin) {
			// Forest is the default — no override needed
			if (activeThemeId !== 'forest') {
				themeVariables = builtin.variables;
			}
			themeMode = builtin.mode;
		} else {
			// Check custom themes
			const custom = db
				.select()
				.from(userThemes)
				.where(and(eq(userThemes.id, activeThemeId), eq(userThemes.userId, locals.user.id)))
				.get();

			if (custom) {
				themeVariables = JSON.parse(custom.variables);
				// Determine mode from source or default to dark
				const modeMatch = custom.source.match(/mode:\s*(dark|light)/);
				themeMode = (modeMatch?.[1] as 'dark' | 'light') || 'dark';
			}
		}
	}

	// Load org settings
	const org = db.select().from(orgSettings).where(eq(orgSettings.id, 'default')).get();
	const platformName = org?.platformName || 'PM';
	const telnyxEnabled = org?.telnyxEnabled ?? false;

	return {
		user: locals.user,
		folders: allFolders,
		sidebarProjects,
		themeVariables,
		themeMode,
		platformName,
		telnyxEnabled
	};
};
