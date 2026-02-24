import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { createRevenueJournalEntry } from '$lib/server/financials/crm-sync.js';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (!body.opportunityId || !body.companyId || !body.amount || !body.description) {
		return json({ error: 'opportunityId, companyId, amount, and description are required' }, { status: 400 });
	}

	const result = await createRevenueJournalEntry({
		opportunityId: body.opportunityId,
		companyId: body.companyId,
		amount: body.amount,
		description: body.description,
		userId: user.id,
		proposalId: body.proposalId
	});

	if (!result) {
		return json({ message: 'Skipped — already synced or financials not configured' });
	}

	return json(result, { status: 201 });
};
