import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmCustomFieldDefs } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { fieldId } = event.params;
	const body = await event.request.json();

	const existing = db.select().from(crmCustomFieldDefs).where(eq(crmCustomFieldDefs.id, fieldId)).get();
	if (!existing) return json({ error: 'Field not found' }, { status: 404 });

	const updates: Record<string, unknown> = { updatedAt: Date.now() };
	if ('label' in body) updates.label = body.label;
	if ('options' in body) updates.options = body.options ? JSON.stringify(body.options) : null;
	if ('required' in body) updates.required = body.required;
	if ('position' in body) updates.position = body.position;
	if ('showInList' in body) updates.showInList = body.showInList;
	if ('showInCard' in body) updates.showInCard = body.showInCard;

	db.update(crmCustomFieldDefs).set(updates).where(eq(crmCustomFieldDefs.id, fieldId)).run();
	const updated = db.select().from(crmCustomFieldDefs).where(eq(crmCustomFieldDefs.id, fieldId)).get();
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { fieldId } = event.params;

	db.delete(crmCustomFieldDefs).where(eq(crmCustomFieldDefs.id, fieldId)).run();
	return json({ ok: true });
};
