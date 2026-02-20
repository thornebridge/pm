import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmProducts, crmPriceTiers } from '$lib/server/db/schema.js';
import { eq, like, and, asc, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const url = event.url;
	const q = url.searchParams.get('q');
	const status = url.searchParams.get('status');
	const type = url.searchParams.get('type');
	const category = url.searchParams.get('category');
	const sort = url.searchParams.get('sort') || 'created';
	const dir = url.searchParams.get('dir') || 'desc';
	const limit = parseInt(url.searchParams.get('limit') || '100');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const conditions = [];
	if (q) conditions.push(like(crmProducts.name, `%${q}%`));
	if (status) conditions.push(eq(crmProducts.status, status as 'active' | 'archived'));
	if (type) conditions.push(eq(crmProducts.type, type as 'product' | 'service' | 'subscription'));
	if (category) conditions.push(eq(crmProducts.category, category));

	const where = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

	const sortCol =
		sort === 'name'
			? crmProducts.name
			: sort === 'updated'
				? crmProducts.updatedAt
				: crmProducts.createdAt;
	const orderFn = dir === 'asc' ? asc : desc;

	let query = db
		.select()
		.from(crmProducts)
		.orderBy(orderFn(sortCol))
		.limit(limit)
		.offset(offset);

	if (where) {
		query = query.where(where) as typeof query;
	}

	const products = query.all();

	// Attach tier count and default price for each product
	const result = products.map((p) => {
		const tiers = db
			.select()
			.from(crmPriceTiers)
			.where(eq(crmPriceTiers.productId, p.id))
			.all();
		const defaultTier = tiers.find((t) => t.isDefault) || tiers[0];
		return {
			...p,
			tierCount: tiers.length,
			defaultPrice: defaultTier?.unitAmount ?? null
		};
	});

	return json(result);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (!body.name?.trim()) {
		return json({ error: 'Product name is required' }, { status: 400 });
	}

	const now = Date.now();
	const product = {
		id: nanoid(12),
		name: body.name.trim(),
		sku: body.sku || null,
		description: body.description || null,
		category: body.category || null,
		type: body.type || 'service',
		status: 'active' as const,
		taxable: body.taxable ?? true,
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	db.insert(crmProducts).values(product).run();
	return json(product, { status: 201 });
};
