import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, bookingEventTypeMembers, users } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const [et] = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!et) return json({ error: 'Not found' }, { status: 404 });

	const members = await db
		.select({
			id: bookingEventTypeMembers.id,
			userId: bookingEventTypeMembers.userId,
			position: bookingEventTypeMembers.position,
			userName: users.name,
			userEmail: users.email
		})
		.from(bookingEventTypeMembers)
		.innerJoin(users, eq(users.id, bookingEventTypeMembers.userId))
		.where(eq(bookingEventTypeMembers.eventTypeId, event.params.id))
		.orderBy(bookingEventTypeMembers.position);

	return json(members);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const [et] = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!et) return json({ error: 'Not found' }, { status: 404 });
	if (!body.userId) return json({ error: 'userId is required' }, { status: 400 });

	// Check user exists
	const [targetUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, body.userId));
	if (!targetUser) return json({ error: 'User not found' }, { status: 404 });

	// Check not already a member
	const [existing] = await db
		.select({ id: bookingEventTypeMembers.id })
		.from(bookingEventTypeMembers)
		.where(
			and(
				eq(bookingEventTypeMembers.eventTypeId, event.params.id),
				eq(bookingEventTypeMembers.userId, body.userId)
			)
		);
	if (existing) return json({ error: 'User is already a member' }, { status: 409 });

	// Get next position
	const existingMembers = await db
		.select({ position: bookingEventTypeMembers.position })
		.from(bookingEventTypeMembers)
		.where(eq(bookingEventTypeMembers.eventTypeId, event.params.id))
		.orderBy(bookingEventTypeMembers.position);

	const nextPosition = existingMembers.length > 0 ? existingMembers[existingMembers.length - 1].position + 1 : 0;

	const member = {
		id: nanoid(12),
		eventTypeId: event.params.id,
		userId: body.userId,
		position: body.position ?? nextPosition
	};

	await db.insert(bookingEventTypeMembers).values(member);
	return json(member, { status: 201 });
};
