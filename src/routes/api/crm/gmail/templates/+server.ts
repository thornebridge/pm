import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { emailTemplates } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const templates = await db.select()
		.from(emailTemplates)
		.where(eq(emailTemplates.userId, user.id))
		.orderBy(desc(emailTemplates.updatedAt));

	return Response.json({ templates });
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();
	const { name, subjectTemplate, bodyTemplate, category } = body as {
		name: string;
		subjectTemplate: string;
		bodyTemplate: string;
		category?: string;
	};

	if (!name?.trim() || !subjectTemplate?.trim() || !bodyTemplate?.trim()) {
		return new Response(JSON.stringify({ error: 'Name, subject, and body are required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const now = Date.now();
	const template = {
		id: nanoid(12),
		userId: user.id,
		name: name.trim(),
		subjectTemplate: subjectTemplate.trim(),
		bodyTemplate: bodyTemplate.trim(),
		category: category?.trim() || null,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(emailTemplates).values(template);

	return Response.json(template, { status: 201 });
};
