import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { orgSettings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

const MAX_SIZE = 512 * 1024; // 512KB
const ALLOWED_TYPES = new Set(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']);

/** GET — serve the logo image */
export const GET: RequestHandler = async () => {
	const [settings] = await db
		.select({ logoData: orgSettings.logoData, logoMimeType: orgSettings.logoMimeType })
		.from(orgSettings)
		.where(eq(orgSettings.id, 'default'));

	if (!settings?.logoData || !settings.logoMimeType) {
		return new Response(null, { status: 404 });
	}

	const buffer = Buffer.from(settings.logoData, 'base64');
	return new Response(buffer, {
		headers: {
			'Content-Type': settings.logoMimeType,
			'Cache-Control': 'public, max-age=3600'
		}
	});
};

/** POST — upload a logo (multipart form data with 'logo' field) */
export const POST: RequestHandler = async (event) => {
	requireAdmin(event);

	const formData = await event.request.formData();
	const file = formData.get('logo');

	if (!file || !(file instanceof File)) {
		return json({ error: 'No logo file provided' }, { status: 400 });
	}

	if (!ALLOWED_TYPES.has(file.type)) {
		return json({ error: 'Invalid file type. Allowed: SVG, PNG, JPEG, WebP' }, { status: 400 });
	}

	if (file.size > MAX_SIZE) {
		return json({ error: 'File too large. Maximum 512KB' }, { status: 400 });
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const base64 = buffer.toString('base64');

	await db.update(orgSettings)
		.set({
			logoData: base64,
			logoMimeType: file.type,
			updatedAt: Date.now()
		})
		.where(eq(orgSettings.id, 'default'));

	return json({ ok: true });
};

/** DELETE — remove the logo */
export const DELETE: RequestHandler = async (event) => {
	requireAdmin(event);

	await db.update(orgSettings)
		.set({
			logoData: null,
			logoMimeType: null,
			updatedAt: Date.now()
		})
		.where(eq(orgSettings.id, 'default'));

	return json({ ok: true });
};
