import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { folders } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const all = db.select().from(folders).orderBy(folders.position).all();
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

	db.insert(folders).values(folder).run();
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
		db.update(folders).set(updates).where(eq(folders.id, id)).run();
	}

	const updated = db.select().from(folders).where(eq(folders.id, id)).get();
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { id } = await event.request.json();

	if (!id) {
		return json({ error: 'id is required' }, { status: 400 });
	}

	db.delete(folders).where(eq(folders.id, id)).run();
	return json({ ok: true });
};
