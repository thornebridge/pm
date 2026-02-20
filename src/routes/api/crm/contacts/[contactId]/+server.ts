import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmContacts } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { contactId } = event.params;

	const contact = db.select().from(crmContacts).where(eq(crmContacts.id, contactId)).get();
	if (!contact) return json({ error: 'Contact not found' }, { status: 404 });

	return json(contact);
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { contactId } = event.params;

	const existing = db.select().from(crmContacts).where(eq(crmContacts.id, contactId)).get();
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

	db.update(crmContacts).set(updates).where(eq(crmContacts.id, contactId)).run();
	const updated = db.select().from(crmContacts).where(eq(crmContacts.id, contactId)).get();
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { contactId } = event.params;

	const existing = db.select().from(crmContacts).where(eq(crmContacts.id, contactId)).get();
	if (!existing) return json({ error: 'Contact not found' }, { status: 404 });

	db.delete(crmContacts).where(eq(crmContacts.id, contactId)).run();
	return json({ ok: true });
};
