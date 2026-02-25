import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ROLE_DEFAULT_ROUTE } from '$lib/config/workspaces';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, ROLE_DEFAULT_ROUTE[locals.user.role] || '/dashboard');
	}
	throw redirect(302, '/login');
};
