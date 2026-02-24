import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { gmailThreads, gmailEntityLinks } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { threadId } = event.params;

	// Verify thread belongs to user
	const thread = db.select({ id: gmailThreads.id })
		.from(gmailThreads)
		.where(and(eq(gmailThreads.id, threadId), eq(gmailThreads.userId, user.id)))
		.get();

	if (!thread) {
		return new Response(JSON.stringify({ error: 'Thread not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const body = await event.request.json();
	const { contactId, companyId, opportunityId } = body as {
		contactId?: string;
		companyId?: string;
		opportunityId?: string;
	};

	if (!contactId && !companyId && !opportunityId) {
		return new Response(JSON.stringify({ error: 'Must provide contactId, companyId, or opportunityId' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const link = {
		id: nanoid(12),
		threadId,
		contactId: contactId || null,
		companyId: companyId || null,
		opportunityId: opportunityId || null,
		linkType: 'manual' as const,
		createdAt: Date.now()
	};

	db.insert(gmailEntityLinks).values(link).run();

	return Response.json({ ok: true, link });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { threadId } = event.params;

	// Verify thread belongs to user
	const thread = db.select({ id: gmailThreads.id })
		.from(gmailThreads)
		.where(and(eq(gmailThreads.id, threadId), eq(gmailThreads.userId, user.id)))
		.get();

	if (!thread) {
		return new Response(JSON.stringify({ error: 'Thread not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const body = await event.request.json();
	const { linkId } = body as { linkId: string };

	if (!linkId) {
		return new Response(JSON.stringify({ error: 'Missing linkId' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	db.delete(gmailEntityLinks)
		.where(and(eq(gmailEntityLinks.id, linkId), eq(gmailEntityLinks.threadId, threadId)))
		.run();

	return Response.json({ ok: true });
};
