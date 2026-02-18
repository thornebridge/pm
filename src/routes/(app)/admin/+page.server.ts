import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listInvites } from '$lib/server/auth/invite.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role !== 'admin') {
		throw redirect(302, '/projects');
	}

	return { invites: listInvites() };
};
