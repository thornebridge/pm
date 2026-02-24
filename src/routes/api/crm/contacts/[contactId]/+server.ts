import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmContacts } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { indexDocument, removeDocument } from '$lib/server/search/meilisearch.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { contactId } = event.params;

	const [contact] = await db.select().from(crmContacts).where(eq(crmContacts.id, contactId));
	if (!contact) return json({ error: 'Contact not found' }, { status: 404 });

	return json(contact);
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { contactId } = event.params;

	const [existing] = await db.select().from(crmContacts).where(eq(crmContacts.id, contactId));
	if (!existing) return json({ error: 'Contact not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	const fields = [
		'firstName',
		'lastName',
		'companyId',
		'email',
		'phone',
		'title',
		'isPrimary',
		'source',
		'notes',
		'ownerId'
	];
	for (const f of fields) {
		if (f in body) updates[f] = body[f];
	}

	if ('firstName' in body && !body.firstName?.trim()) {
		return json({ error: 'First name is required' }, { status: 400 });
	}
	if ('lastName' in body && !body.lastName?.trim()) {
		return json({ error: 'Last name is required' }, { status: 400 });
	}

	await db.update(crmContacts).set(updates).where(eq(crmContacts.id, contactId));
	const [updated] = await db.select().from(crmContacts).where(eq(crmContacts.id, contactId));
	if (updated) indexDocument('contacts', { id: updated.id, firstName: updated.firstName, lastName: updated.lastName, email: updated.email, phone: updated.phone, title: updated.title, source: updated.source, companyId: updated.companyId, ownerId: updated.ownerId, notes: updated.notes, updatedAt: updated.updatedAt });
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { contactId } = event.params;

	const [existing] = await db.select().from(crmContacts).where(eq(crmContacts.id, contactId));
	if (!existing) return json({ error: 'Contact not found' }, { status: 404 });

	await db.delete(crmContacts).where(eq(crmContacts.id, contactId));
	removeDocument('contacts', contactId);
	return json({ ok: true });
};
