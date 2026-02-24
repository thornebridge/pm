import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { folders } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastFolderChanged } from '$lib/server/ws/handlers.js';

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const all = await db.select().from(folders).orderBy(folders.position);
	return json(all);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { name, parentId, color } = await event.request.json();

	if (!name?.trim()) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const id = nanoid(12);
	const folder = {
		id,
		name: name.trim(),
		slug: slugify(name) || id,
		parentId: parentId || null,
		color: color || null,
		position: 0,
		createdBy: user.id,
		createdAt: Date.now()
	};

	await db.insert(folders).values(folder);
	broadcastFolderChanged('created');
	return json(folder, { status: 201 });
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { id, name, parentId, color, position } = await event.request.json();

	if (!id) {
		return json({ error: 'id is required' }, { status: 400 });
	}

	const updates: Record<string, unknown> = {};
	if (name !== undefined) {
		updates.name = name.trim();
		updates.slug = slugify(name) || id;
	}
	if (parentId !== undefined) updates.parentId = parentId;
	if (color !== undefined) updates.color = color;
	if (position !== undefined) updates.position = position;

	if (Object.keys(updates).length > 0) {
		await db.update(folders).set(updates).where(eq(folders.id, id));
	}

	const [updated] = await db.select().from(folders).where(eq(folders.id, id));
	broadcastFolderChanged('updated');
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { id } = await event.request.json();

	if (!id) {
		return json({ error: 'id is required' }, { status: 400 });
	}

	await db.delete(folders).where(eq(folders.id, id));
	broadcastFolderChanged('deleted');
	return json({ ok: true });
};
