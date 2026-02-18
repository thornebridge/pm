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
}
