import { db } from './index.js';
import { users, crmPipelineStages, crmProducts, crmPriceTiers, finAccounts } from './schema.js';
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
	seedFinancialAccounts();

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

function seedFinancialAccounts() {
	const existing = db.select({ n: count() }).from(finAccounts).get();
	if (existing && existing.n > 0) return;

	const admin = db.select({ id: users.id }).from(users).limit(1).get();
	if (!admin) return;

	const now = Date.now();
	const accounts: Array<{
		accountNumber: number;
		name: string;
		accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
		subtype: string | null;
		normalBalance: 'debit' | 'credit';
		parentNumber?: number;
	}> = [
		// Assets (1000s) — debit-normal
		{ accountNumber: 1000, name: 'Cash & Bank Accounts', accountType: 'asset', subtype: 'current_asset', normalBalance: 'debit' },
		{ accountNumber: 1010, name: 'Checking Account', accountType: 'asset', subtype: 'current_asset', normalBalance: 'debit', parentNumber: 1000 },
		{ accountNumber: 1020, name: 'Savings Account', accountType: 'asset', subtype: 'current_asset', normalBalance: 'debit', parentNumber: 1000 },
		{ accountNumber: 1030, name: 'Petty Cash', accountType: 'asset', subtype: 'current_asset', normalBalance: 'debit', parentNumber: 1000 },
		{ accountNumber: 1040, name: 'PayPal', accountType: 'asset', subtype: 'current_asset', normalBalance: 'debit', parentNumber: 1000 },
		{ accountNumber: 1100, name: 'Accounts Receivable', accountType: 'asset', subtype: 'current_asset', normalBalance: 'debit' },
		{ accountNumber: 1200, name: 'Accounts Receivable - Trade', accountType: 'asset', subtype: 'current_asset', normalBalance: 'debit', parentNumber: 1100 },
		{ accountNumber: 1300, name: 'Prepaid Expenses', accountType: 'asset', subtype: 'current_asset', normalBalance: 'debit' },
		{ accountNumber: 1400, name: 'Undeposited Funds', accountType: 'asset', subtype: 'current_asset', normalBalance: 'debit' },
		{ accountNumber: 1500, name: 'Fixed Assets', accountType: 'asset', subtype: 'fixed_asset', normalBalance: 'debit' },
		{ accountNumber: 1510, name: 'Equipment', accountType: 'asset', subtype: 'fixed_asset', normalBalance: 'debit', parentNumber: 1500 },
		{ accountNumber: 1520, name: 'Furniture & Fixtures', accountType: 'asset', subtype: 'fixed_asset', normalBalance: 'debit', parentNumber: 1500 },
		{ accountNumber: 1530, name: 'Vehicles', accountType: 'asset', subtype: 'fixed_asset', normalBalance: 'debit', parentNumber: 1500 },
		{ accountNumber: 1590, name: 'Accumulated Depreciation', accountType: 'asset', subtype: 'fixed_asset', normalBalance: 'credit', parentNumber: 1500 },

		// Liabilities (2000s) — credit-normal
		{ accountNumber: 2000, name: 'Accounts Payable', accountType: 'liability', subtype: 'current_liability', normalBalance: 'credit' },
		{ accountNumber: 2100, name: 'Credit Card', accountType: 'liability', subtype: 'current_liability', normalBalance: 'credit' },
		{ accountNumber: 2200, name: 'Accrued Expenses', accountType: 'liability', subtype: 'current_liability', normalBalance: 'credit' },
		{ accountNumber: 2300, name: 'Payroll Liabilities', accountType: 'liability', subtype: 'current_liability', normalBalance: 'credit' },
		{ accountNumber: 2310, name: 'Federal Tax Withheld', accountType: 'liability', subtype: 'current_liability', normalBalance: 'credit', parentNumber: 2300 },
		{ accountNumber: 2320, name: 'State Tax Withheld', accountType: 'liability', subtype: 'current_liability', normalBalance: 'credit', parentNumber: 2300 },
		{ accountNumber: 2400, name: 'Sales Tax Payable', accountType: 'liability', subtype: 'current_liability', normalBalance: 'credit' },
		{ accountNumber: 2500, name: 'Unearned Revenue', accountType: 'liability', subtype: 'current_liability', normalBalance: 'credit' },
		{ accountNumber: 2600, name: 'Long-Term Debt', accountType: 'liability', subtype: 'long_term_liability', normalBalance: 'credit' },

		// Equity (3000s) — credit-normal
		{ accountNumber: 3000, name: "Owner's Equity", accountType: 'equity', subtype: null, normalBalance: 'credit' },
		{ accountNumber: 3100, name: "Owner's Draw", accountType: 'equity', subtype: null, normalBalance: 'debit' },
		{ accountNumber: 3200, name: 'Retained Earnings', accountType: 'equity', subtype: null, normalBalance: 'credit' },
		{ accountNumber: 3900, name: 'Opening Balance Equity', accountType: 'equity', subtype: null, normalBalance: 'credit' },

		// Revenue (4000s) — credit-normal
		{ accountNumber: 4000, name: 'Sales Revenue', accountType: 'revenue', subtype: null, normalBalance: 'credit' },
		{ accountNumber: 4010, name: 'Service Revenue', accountType: 'revenue', subtype: null, normalBalance: 'credit' },
		{ accountNumber: 4020, name: 'Consulting Revenue', accountType: 'revenue', subtype: null, normalBalance: 'credit' },
		{ accountNumber: 4100, name: 'Interest Income', accountType: 'revenue', subtype: null, normalBalance: 'credit' },
		{ accountNumber: 4200, name: 'Refunds & Reimbursements', accountType: 'revenue', subtype: null, normalBalance: 'debit' },

		// Expenses (5000s+) — debit-normal
		{ accountNumber: 5000, name: 'Cost of Goods Sold', accountType: 'expense', subtype: 'cogs', normalBalance: 'debit' },
		{ accountNumber: 5100, name: 'Payroll Expense', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 5110, name: 'Salaries & Wages', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit', parentNumber: 5100 },
		{ accountNumber: 5120, name: 'Employee Benefits', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit', parentNumber: 5100 },
		{ accountNumber: 5130, name: 'Payroll Taxes', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit', parentNumber: 5100 },
		{ accountNumber: 5200, name: 'Rent', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 5300, name: 'Utilities', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 5400, name: 'Office Supplies', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 5500, name: 'Software & Subscriptions', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 5600, name: 'Marketing & Advertising', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 5700, name: 'Professional Services', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 5710, name: 'Legal', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit', parentNumber: 5700 },
		{ accountNumber: 5720, name: 'Accounting', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit', parentNumber: 5700 },
		{ accountNumber: 5800, name: 'Travel', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 5900, name: 'Insurance', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 6000, name: 'Depreciation Expense', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 6100, name: 'Bank Fees & Charges', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 6200, name: 'Taxes & Licenses', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 6300, name: 'Meals & Entertainment', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 6400, name: 'Miscellaneous Expense', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
		{ accountNumber: 6500, name: 'Interest Expense', accountType: 'expense', subtype: 'operating_expense', normalBalance: 'debit' },
	];

	// First pass: create all accounts with temporary IDs, build number→id map
	const numberToId = new Map<number, string>();
	for (const acct of accounts) {
		const id = nanoid(12);
		numberToId.set(acct.accountNumber, id);
	}

	// Second pass: insert with resolved parentId
	for (const acct of accounts) {
		const id = numberToId.get(acct.accountNumber)!;
		const parentId = acct.parentNumber ? numberToId.get(acct.parentNumber) ?? null : null;

		db.insert(finAccounts)
			.values({
				id,
				accountNumber: acct.accountNumber,
				name: acct.name,
				accountType: acct.accountType,
				subtype: acct.subtype,
				description: null,
				parentId,
				normalBalance: acct.normalBalance,
				currency: 'USD',
				active: true,
				isSystem: true,
				createdBy: admin.id,
				createdAt: now,
				updatedAt: now
			})
			.run();
	}

	console.log(`[seed] Created ${accounts.length} default financial accounts`);
}

export { AUTOMATION_USER_ID };
