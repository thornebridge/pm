import { db } from './index.js';
import { users, crmPipelineStages } from './schema.js';
import { eq, count } from 'drizzle-orm';
import { hashPassword } from '../auth/password.js';
import { nanoid } from 'nanoid';
import { env } from '$env/dynamic/private';

export async function seed() {
	const adminEmail = env.PM_ADMIN_EMAIL;
	const adminPassword = env.PM_ADMIN_PASSWORD;

	if (!adminEmail || !adminPassword) return;

	const existing = db.select().from(users).where(eq(users.email, adminEmail)).get();
	if (existing) return;

	const now = Date.now();
	const hash = await hashPassword(adminPassword);

	db.insert(users)
		.values({
			id: nanoid(12),
			email: adminEmail,
			name: 'Admin',
			passwordHash: hash,
			role: 'admin',
			createdAt: now,
			updatedAt: now
		})
		.run();

	console.log(`[seed] Created admin user: ${adminEmail}`);

	// Ensure automation system user exists
	await seedAutomationUser();

	// Seed CRM pipeline stages
	seedCrmPipelineStages();
}

const AUTOMATION_USER_ID = '__automation__';

async function seedAutomationUser() {
	const existing = db.select().from(users).where(eq(users.id, AUTOMATION_USER_ID)).get();
	if (existing) return;

	const now = Date.now();
	const hash = await hashPassword(nanoid(32)); // random pw, never used for login

	db.insert(users)
		.values({
			id: AUTOMATION_USER_ID,
			email: 'automation@system.local',
			name: 'Automation',
			passwordHash: hash,
			role: 'member',
			createdAt: now,
			updatedAt: now
		})
		.run();

	console.log('[seed] Created automation system user');
}

function seedCrmPipelineStages() {
	const existing = db.select({ n: count() }).from(crmPipelineStages).get();
	if (existing && existing.n > 0) return;

	const now = Date.now();
	const stages = [
		{ name: 'Prospecting', color: '#6366f1', position: 0, isClosed: false, isWon: false, probability: 10 },
		{ name: 'Qualification', color: '#8b5cf6', position: 1, isClosed: false, isWon: false, probability: 25 },
		{ name: 'Proposal', color: '#f59e0b', position: 2, isClosed: false, isWon: false, probability: 50 },
		{ name: 'Negotiation', color: '#f97316', position: 3, isClosed: false, isWon: false, probability: 75 },
		{ name: 'Closed Won', color: '#22c55e', position: 4, isClosed: true, isWon: true, probability: 100 },
		{ name: 'Closed Lost', color: '#ef4444', position: 5, isClosed: true, isWon: false, probability: 0 }
	];

	for (const stage of stages) {
		db.insert(crmPipelineStages)
			.values({ id: nanoid(12), ...stage, createdAt: now })
			.run();
	}

	console.log('[seed] Created default CRM pipeline stages');
}

export { AUTOMATION_USER_ID };
