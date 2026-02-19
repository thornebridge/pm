import { db } from './index.js';
import { users } from './schema.js';
import { eq } from 'drizzle-orm';
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

export { AUTOMATION_USER_ID };
