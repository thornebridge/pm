import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { createInvite, listInvites, deleteInvite } from '$lib/server/auth/invite.js';

export const GET: RequestHandler = async (event) => {
	requireAdmin(event);
	return json(listInvites());
};

export const POST: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { email, role } = await event.request.json();

	const invite = createInvite(user.id, role || 'member', email);
	return json(invite, { status: 201 });
};

export const DELETE: RequestHandler = async (event) => {
	requireAdmin(event);
	const { id } = await event.request.json();

	if (!id) {
		return json({ error: 'id is required' }, { status: 400 });
	}

	deleteInvite(id);
	return json({ ok: true });
};
