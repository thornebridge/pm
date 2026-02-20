import { db } from './index.js';
import { users, crmPipelineStages, crmProducts, crmPriceTiers } from './schema.js';
import { eq, count } from 'drizzle-orm';
import { hashPassword } from '../auth/password.js';
import { nanoid } from 'nanoid';
import { env } from '$env/dynamic/private';

export async function seed() {
	const adminEmail = env.PM_ADMIN_EMAIL;
	const adminPassword = env.PM_ADMIN_PASSWORD;

	// Always run idempotent seeds regardless of admin state
	await seedAutomationUser();
	seedCrmPipelineStages();
	seedCrmProducts();

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

function seedCrmProducts() {
	const existing = db.select({ n: count() }).from(crmProducts).get();
	if (existing && existing.n > 0) return;

	const now = Date.now();

	// Find an admin user to use as createdBy
	const admin = db.select({ id: users.id }).from(users).limit(1).get();
	if (!admin) return; // no users yet — skip product seeds

	const products = [
		{
			id: nanoid(12),
			name: 'Web Development',
			sku: 'SVC-WEBDEV',
			description: 'Custom web application development services',
			category: 'Development',
			type: 'service' as const,
			tiers: [
				{ name: 'Hourly Rate', billingModel: 'per_unit' as const, unitAmount: 15000, unitLabel: 'hour', isDefault: true },
				{ name: 'Monthly Retainer', billingModel: 'recurring' as const, unitAmount: 800000, billingInterval: 'monthly' as const }
			]
		},
		{
			id: nanoid(12),
			name: 'SaaS Platform License',
			sku: 'SUB-SAAS',
			description: 'Cloud platform subscription with per-seat pricing',
			category: 'Software',
			type: 'subscription' as const,
			tiers: [
				{ name: 'Starter (Monthly)', billingModel: 'per_unit' as const, unitAmount: 2900, billingInterval: 'monthly' as const, unitLabel: 'seat', isDefault: true },
				{ name: 'Pro (Annual)', billingModel: 'per_unit' as const, unitAmount: 24900, billingInterval: 'annual' as const, unitLabel: 'seat' },
				{ name: 'Enterprise (Annual)', billingModel: 'recurring' as const, unitAmount: 500000, billingInterval: 'annual' as const, setupFee: 250000 }
			]
		},
		{
			id: nanoid(12),
			name: 'Strategy Consulting',
			sku: 'SVC-STRAT',
			description: 'Business strategy and digital transformation consulting',
			category: 'Consulting',
			type: 'service' as const,
			tiers: [
				{ name: 'Discovery Workshop', billingModel: 'one_time' as const, unitAmount: 500000, isDefault: true },
				{ name: 'Advisory Retainer', billingModel: 'recurring' as const, unitAmount: 1500000, billingInterval: 'monthly' as const }
			]
		}
	];

	for (const product of products) {
		const { tiers, ...productData } = product;
		db.insert(crmProducts)
			.values({
				...productData,
				status: 'active',
				taxable: true,
				createdBy: admin.id,
				createdAt: now,
				updatedAt: now
			})
			.run();

		for (let i = 0; i < tiers.length; i++) {
			const tier = tiers[i];
			db.insert(crmPriceTiers)
				.values({
					id: nanoid(12),
					productId: product.id,
					name: tier.name,
					billingModel: tier.billingModel,
					unitAmount: tier.unitAmount,
					currency: 'USD',
					billingInterval: tier.billingInterval ?? null,
					setupFee: tier.setupFee ?? null,
					trialDays: null,
					unitLabel: tier.unitLabel ?? null,
					minQuantity: null,
					maxQuantity: null,
					isDefault: tier.isDefault ?? false,
					position: i,
					createdAt: now,
					updatedAt: now
				})
				.run();
		}
	}

	console.log('[seed] Created example CRM products with price tiers');
}

export { AUTOMATION_USER_ID };
