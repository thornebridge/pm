import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmLeads } from '$lib/server/db/schema.js';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { indexDocument } from '$lib/server/search/meilisearch.js';
import { emitCrmAutomationEvent } from '$lib/server/crm-automations/emit.js';

function parseCsvLine(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"' && line[i + 1] === '"') {
				current += '"';
				i++;
			} else if (ch === '"') {
				inQuotes = false;
			} else {
				current += ch;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
			} else if (ch === ',') {
				fields.push(current.trim());
				current = '';
			} else {
				current += ch;
			}
		}
	}
	fields.push(current.trim());
	return fields;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
	// Strip BOM
	const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
	const lines = clean.split(/\r?\n/).filter((l) => l.trim());
	if (lines.length < 1) return { headers: [], rows: [] };
	const headers = parseCsvLine(lines[0]);
	const rows = lines.slice(1).map(parseCsvLine);
	return { headers, rows };
}

const VALID_FIELDS = new Set([
	'firstName', 'lastName', 'email', 'phone', 'title',
	'companyName', 'website', 'industry', 'companySize', 'address', 'notes'
]);

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const formData = await event.request.formData();
	const file = formData.get('file') as File;
	const mappingJson = formData.get('mapping') as string;
	const skipDuplicates = formData.get('skipDuplicates') === 'true';
	const defaultStatusId = formData.get('defaultStatusId') as string;

	if (!file) return json({ error: 'CSV file is required' }, { status: 400 });
	if (!mappingJson) return json({ error: 'Column mapping is required' }, { status: 400 });
	if (!defaultStatusId) return json({ error: 'Default status is required' }, { status: 400 });

	const mapping = JSON.parse(mappingJson) as Record<string, string>;
	const text = await file.text();
	const { headers, rows } = parseCsv(text);

	if (headers.length === 0 || rows.length === 0) {
		return json({ error: 'CSV is empty or has no data rows' }, { status: 400 });
	}

	const now = Date.now();
	let imported = 0;
	let skipped = 0;
	const errors: Array<{ row: number; error: string }> = [];

	// Pre-fetch existing emails for dedup
	let existingEmails = new Set<string>();
	if (skipDuplicates) {
		const existing = await db
			.select({ email: crmLeads.email })
			.from(crmLeads)
			.where(sql`${crmLeads.email} IS NOT NULL`);
		existingEmails = new Set(existing.map((e) => e.email!.toLowerCase()));
	}

	// Build header-to-index mapping
	const headerIdx: Record<string, number> = {};
	for (let i = 0; i < headers.length; i++) {
		headerIdx[headers[i]] = i;
	}

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];

		// Map row to lead fields
		const lead: Record<string, string | null> = {};
		for (const [csvHeader, fieldName] of Object.entries(mapping)) {
			if (!fieldName || !VALID_FIELDS.has(fieldName)) continue;
			const idx = headerIdx[csvHeader];
			if (idx !== undefined && row[idx]) {
				lead[fieldName] = row[idx];
			}
		}

		// Validate required fields
		if (!lead.firstName?.trim() || !lead.lastName?.trim()) {
			errors.push({ row: i + 2, error: 'Missing first name or last name' });
			continue;
		}

		// Dedup by email
		if (skipDuplicates && lead.email) {
			const emailLower = lead.email.toLowerCase();
			if (existingEmails.has(emailLower)) {
				skipped++;
				continue;
			}
			existingEmails.add(emailLower);
		}

		const record = {
			id: nanoid(12),
			firstName: lead.firstName!.trim(),
			lastName: lead.lastName!.trim(),
			email: lead.email || null,
			phone: lead.phone || null,
			title: lead.title || null,
			companyName: lead.companyName || null,
			website: lead.website || null,
			industry: lead.industry || null,
			companySize: (lead.companySize as '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+') || null,
			address: lead.address || null,
			source: 'csv_import' as const,
			statusId: defaultStatusId,
			notes: lead.notes || null,
			convertedAt: null,
			convertedCompanyId: null,
			convertedContactId: null,
			convertedOpportunityId: null,
			ownerId: null,
			createdBy: user.id,
			createdAt: now,
			updatedAt: now
		};

		try {
			await db.insert(crmLeads).values(record);
			indexDocument('leads', {
				id: record.id, firstName: record.firstName, lastName: record.lastName,
				email: record.email, phone: record.phone, title: record.title,
				companyName: record.companyName, source: record.source, statusId: record.statusId,
				ownerId: record.ownerId, notes: record.notes, updatedAt: record.updatedAt,
				createdAt: record.createdAt
			});
			emitCrmAutomationEvent({
				event: 'lead.created',
				entityType: 'lead',
				entityId: record.id,
				entity: record as unknown as Record<string, unknown>,
				userId: user.id
			});
			imported++;
		} catch (err) {
			errors.push({ row: i + 2, error: err instanceof Error ? err.message : 'Insert failed' });
		}
	}

	return json({ imported, skipped, errors, total: rows.length });
};
