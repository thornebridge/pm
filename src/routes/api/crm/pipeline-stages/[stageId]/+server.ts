import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmPipelineStages, crmOpportunities } from '$lib/server/db/schema.js';
import { eq, count } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { stageId } = event.params;

	const [existing] = await db
		.select()
		.from(crmPipelineStages)
		.where(eq(crmPipelineStages.id, stageId));
	if (!existing) return json({ error: 'Stage not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = {};

	if ('name' in body) updates.name = body.name;
	if ('color' in body) updates.color = body.color;
	if ('position' in body) updates.position = body.position;
	if ('isClosed' in body) updates.isClosed = body.isClosed;
	if ('isWon' in body) updates.isWon = body.isWon;
	if ('probability' in body) updates.probability = body.probability;

	await db.update(crmPipelineStages).set(updates).where(eq(crmPipelineStages.id, stageId));
	const [updated] = await db
		.select()
		.from(crmPipelineStages)
		.where(eq(crmPipelineStages.id, stageId));
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { stageId } = event.params;

	const [oppCount] = await db
		.select({ n: count() })
		.from(crmOpportunities)
		.where(eq(crmOpportunities.stageId, stageId));

	if (oppCount && oppCount.n > 0) {
		return json(
			{ error: `Cannot delete stage with ${oppCount.n} opportunities. Move them first.` },
			{ status: 400 }
		);
	}

	await db.delete(crmPipelineStages).where(eq(crmPipelineStages.id, stageId));
	return json({ ok: true });
};
