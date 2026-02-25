import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { folders, projects, users, userThemes, orgSettings } from '$lib/server/db/schema.js';
import { desc, eq, and, sql } from 'drizzle-orm';
import { getBuiltinTheme, BUILTIN_THEMES } from '$lib/server/theme/builtins.js';
import { ROLE_MODES } from '$lib/config/workspaces';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// Skip ops data for roles that don't have ops workspace access
	const needsOpsData = ROLE_MODES[locals.user.role]?.includes('ops') ?? true;

	const allFolders = needsOpsData
		? await db.select().from(folders).orderBy(folders.position)
		: [];
	const allProjects = needsOpsData
		? await db
				.select({
					id: projects.id,
					name: projects.name,
					slug: projects.slug,
					color: projects.color,
					folderId: projects.folderId,
					archived: projects.archived,
					hasLogo: sql<boolean>`${projects.logoData} is not null`.as('has_logo')
				})
				.from(projects)
				.orderBy(desc(projects.updatedAt))
		: [];

	// Sidebar only shows non-archived projects
	const sidebarProjects = allProjects.filter((p) => !p.archived);

	// Load user's active theme
	let themeVariables: Record<string, string> | null = null;
	let themeMode: 'dark' | 'light' = 'dark';

	const [userRow] = await db
		.select({ activeThemeId: users.activeThemeId })
		.from(users)
		.where(eq(users.id, locals.user.id));

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
			const [custom] = await db
				.select()
				.from(userThemes)
				.where(and(eq(userThemes.id, activeThemeId), eq(userThemes.userId, locals.user.id)));

			if (custom) {
				themeVariables = JSON.parse(custom.variables);
				// Determine mode from source or default to dark
				const modeMatch = custom.source.match(/mode:\s*(dark|light)/);
				themeMode = (modeMatch?.[1] as 'dark' | 'light') || 'dark';
			}
		}
	}

	// Load org settings
	const [org] = await db.select().from(orgSettings).where(eq(orgSettings.id, 'default'));
	const platformName = org?.platformName || 'PM';
	const telnyxEnabled = org?.telnyxEnabled ?? false;
	const hasLogo = !!(org?.logoData);

	return {
		user: locals.user,
		folders: allFolders,
		sidebarProjects,
		themeVariables,
		themeMode,
		platformName,
		telnyxEnabled,
		hasLogo
	};
};
