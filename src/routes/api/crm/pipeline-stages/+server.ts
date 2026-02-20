import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmPipelineStages } from '$lib/server/db/schema.js';
import { asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const stages = db
		.select()
		.from(crmPipelineStages)
		.orderBy(asc(crmPipelineStages.position))
		.all();
	return json(stages);
};

export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const body = await event.request.json();

	if (!body.name?.trim()) {
		return json({ error: 'Stage name is required' }, { status: 400 });
	}

	const maxPos = db
		.select({ max: sql<number>`MAX(${crmPipelineStages.position})` })
		.from(crmPipelineStages)
		.get();

	const stage = {
		id: nanoid(12),
		name: body.name.trim(),
		color: body.color || '#6366f1',
		position: (maxPos?.max ?? -1) + 1,
		isClosed: body.isClosed || false,
		isWon: body.isWon || false,
		probability: body.probability ?? 0,
		createdAt: Date.now()
	};

	db.insert(crmPipelineStages).values(stage).run();
	return json(stage, { status: 201 });
};
