import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { orgSettings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

function getOrgSettings() {
	let settings = db.select().from(orgSettings).where(eq(orgSettings.id, 'default')).get();
	if (!settings) {
		db.insert(orgSettings)
			.values({ id: 'default', platformName: 'PM', updatedAt: Date.now() })
			.run();
		settings = db.select().from(orgSettings).where(eq(orgSettings.id, 'default')).get()!;
	}
	return settings;
}

/** GET — read org settings */
export const GET: RequestHandler = async (event) => {
	requireAdmin(event);
	return json(getOrgSettings());
};

/** PUT — update org settings */
export const PUT: RequestHandler = async (event) => {
	requireAdmin(event);
	const body = await event.request.json();

	const current = getOrgSettings();

	const platformName =
		typeof body.platformName === 'string' && body.platformName.trim().length > 0 && body.platformName.trim().length <= 30
			? body.platformName.trim()
			: current.platformName;

	db.update(orgSettings)
		.set({ platformName, updatedAt: Date.now() })
		.where(eq(orgSettings.id, 'default'))
		.run();

	return json({ ...current, platformName });
};
