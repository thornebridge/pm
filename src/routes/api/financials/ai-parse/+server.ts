import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { finAccounts } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { parseTransaction } from '$lib/server/ai/providers.js';

export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const body = await event.request.json();
	const { input } = body;

	if (!input?.trim()) {
		return json({ error: 'Input text is required' }, { status: 400 });
	}

	const accounts = await db
		.select({
			id: finAccounts.id,
			accountNumber: finAccounts.accountNumber,
			name: finAccounts.name,
			accountType: finAccounts.accountType,
			subtype: finAccounts.subtype,
			normalBalance: finAccounts.normalBalance
		})
		.from(finAccounts)
		.where(eq(finAccounts.active, true))
		.orderBy(asc(finAccounts.accountNumber));

	try {
		const parsed = await parseTransaction(input.trim(), accounts);
		return json(parsed);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'AI parsing failed';
		return json({ error: message }, { status: 502 });
	}
};
