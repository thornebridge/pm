import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { projects } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

const MAX_SIZE = 512 * 1024; // 512KB
const ALLOWED_TYPES = new Set(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']);

/** GET — serve the project logo image */
export const GET: RequestHandler = async ({ params }) => {
	const [project] = await db
		.select({ logoData: projects.logoData, logoMimeType: projects.logoMimeType })
		.from(projects)
		.where(eq(projects.id, params.projectId));

	if (!project?.logoData || !project.logoMimeType) {
		return new Response(null, { status: 404 });
	}

	const buffer = Buffer.from(project.logoData, 'base64');
	return new Response(buffer, {
		headers: {
			'Content-Type': project.logoMimeType,
			'Cache-Control': 'public, max-age=3600'
		}
	});
};

/** POST — upload a project logo (multipart form data with 'logo' field) */
export const POST: RequestHandler = async (event) => {
	requireAuth(event);

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

	await db
		.update(projects)
		.set({
			logoData: base64,
			logoMimeType: file.type,
			updatedAt: Date.now()
		})
		.where(eq(projects.id, event.params.projectId));

	return json({ ok: true });
};

/** DELETE — remove the project logo */
export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);

	await db
		.update(projects)
		.set({
			logoData: null,
			logoMimeType: null,
			updatedAt: Date.now()
		})
		.where(eq(projects.id, event.params.projectId));

	return json({ ok: true });
};
