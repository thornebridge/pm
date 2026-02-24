import { db } from '$lib/server/db/index.js';
import { orgSettings, crmContacts, crmCompanies } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export interface TelnyxConfig {
	enabled: boolean;
	apiKey: string;
	connectionId: string;
	credentialId: string;
	callerNumbers: string[];
	recordCalls: boolean;
}

const TELNYX_API_BASE = 'https://api.telnyx.com/v2';

let _rotationIndex = 0;

export function getTelnyxConfig(): TelnyxConfig | null {
	const org = db.select().from(orgSettings).where(eq(orgSettings.id, 'default')).get();
	if (!org?.telnyxEnabled || !org.telnyxApiKey || !org.telnyxConnectionId || !org.telnyxCredentialId) {
		return null;
	}

	let callerNumbers: string[] = [];
	if (org.telnyxCallerNumber) {
		try {
			const parsed = JSON.parse(org.telnyxCallerNumber);
			callerNumbers = Array.isArray(parsed) ? parsed.filter(Boolean) : [org.telnyxCallerNumber];
		} catch {
			// Legacy single number format
			callerNumbers = [org.telnyxCallerNumber];
		}
	}

	return {
		enabled: true,
		apiKey: org.telnyxApiKey,
		connectionId: org.telnyxConnectionId,
		credentialId: org.telnyxCredentialId,
		callerNumbers,
		recordCalls: org.telnyxRecordCalls
	};
}

/** Round-robin through the configured caller numbers */
export function getNextCallerNumber(config: TelnyxConfig): string {
	if (config.callerNumbers.length === 0) return '';
	const number = config.callerNumbers[_rotationIndex % config.callerNumbers.length];
	_rotationIndex++;
	return number;
}

export async function generateWebRtcToken(config: TelnyxConfig): Promise<string> {
	const res = await fetch(`${TELNYX_API_BASE}/telephony_credentials/${config.credentialId}/token`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			'Content-Type': 'application/json'
		}
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Telnyx token generation failed (${res.status}): ${text}`);
	}
	const contentType = res.headers.get('content-type') || '';
	if (contentType.includes('application/json')) {
		const data = await res.json();
		return typeof data === 'string' ? data : data.data;
	}
	// Telnyx returns the JWT as plain text
	return await res.text();
}

export async function validateTelnyxCredentials(apiKey: string, credentialId: string): Promise<{ valid: boolean; error?: string }> {
	try {
		const res = await fetch(`${TELNYX_API_BASE}/telephony_credentials/${credentialId}`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			}
		});
		if (res.ok) {
			return { valid: true };
		}
		const text = await res.text();
		return { valid: false, error: `HTTP ${res.status}: ${text}` };
	} catch (err) {
		return { valid: false, error: err instanceof Error ? err.message : 'Connection failed' };
	}
}

export function lookupContactByPhone(phone: string) {
	// Normalize: strip everything except digits, then try with/without leading 1
	const digits = phone.replace(/\D/g, '');
	const variants = [phone, digits, `+${digits}`, `+1${digits}`];
	if (digits.startsWith('1') && digits.length === 11) {
		variants.push(digits.slice(1), `+${digits.slice(1)}`);
	}

	// Search contacts
	for (const variant of variants) {
		const contact = db
			.select({ id: crmContacts.id, firstName: crmContacts.firstName, lastName: crmContacts.lastName, companyId: crmContacts.companyId })
			.from(crmContacts)
			.where(eq(crmContacts.phone, variant))
			.get();
		if (contact) return { contactId: contact.id, contactName: `${contact.firstName} ${contact.lastName}`, companyId: contact.companyId };
	}

	// Search companies
	for (const variant of variants) {
		const company = db
			.select({ id: crmCompanies.id, name: crmCompanies.name })
			.from(crmCompanies)
			.where(eq(crmCompanies.phone, variant))
			.get();
		if (company) return { companyId: company.id, contactName: company.name, contactId: null };
	}

	return null;
}
