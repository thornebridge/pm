import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { recordPaymentReceived } from '$lib/server/financials/crm-sync.js';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (!body.bankAccountId || !body.amount || !body.opportunityId || !body.companyId || !body.description) {
		return json({ error: 'bankAccountId, amount, opportunityId, companyId, and description are required' }, { status: 400 });
	}

	const result = await recordPaymentReceived({
		bankAccountId: body.bankAccountId,
		amount: body.amount,
		opportunityId: body.opportunityId,
		companyId: body.companyId,
		description: body.description,
		userId: user.id
	});

	if (!result) {
		return json({ message: 'Skipped — financials not configured' });
	}

	return json(result, { status: 201 });
};
