import { db } from '$lib/server/db/index.js';
import { orgSettings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AIConfig {
	provider: 'openai' | 'anthropic' | 'gemini';
	apiKey: string;
	model: string;
	endpoint: string;
}

export interface AccountContext {
	id: string;
	accountNumber: number;
	name: string;
	accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
	subtype: string | null;
	normalBalance: 'debit' | 'credit';
}

export interface ParsedTransaction {
	transactionType: 'expense' | 'deposit' | 'transfer';
	amount: number;
	description: string;
	memo: string | null;
	date: string;
	suggestedExpenseAccountId: string | null;
	suggestedRevenueAccountId: string | null;
	suggestedBankAccountId: string | null;
	suggestedFromAccountId: string | null;
	suggestedToAccountId: string | null;
	referenceNumber: string | null;
	isRecurring: boolean;
	frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | null;
	recurringEndDate: string | null;
	recurringName: string | null;
	confidence: number;
}

// ─── Structured Output Schema ───────────────────────────────────────────────

const TRANSACTION_SCHEMA = {
	type: 'object' as const,
	properties: {
		transactionType: { type: 'string' as const, enum: ['expense', 'deposit', 'transfer'] },
		amount: { type: 'number' as const },
		description: { type: 'string' as const },
		memo: { type: ['string', 'null'] as const },
		date: { type: 'string' as const, description: 'ISO date YYYY-MM-DD' },
		suggestedExpenseAccountId: { type: ['string', 'null'] as const },
		suggestedRevenueAccountId: { type: ['string', 'null'] as const },
		suggestedBankAccountId: { type: ['string', 'null'] as const },
		suggestedFromAccountId: { type: ['string', 'null'] as const },
		suggestedToAccountId: { type: ['string', 'null'] as const },
		referenceNumber: { type: ['string', 'null'] as const },
		isRecurring: { type: 'boolean' as const },
		frequency: {
			type: ['string', 'null'] as const,
			enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', null]
		},
		recurringEndDate: { type: ['string', 'null'] as const },
		recurringName: { type: ['string', 'null'] as const },
		confidence: { type: 'number' as const }
	},
	required: [
		'transactionType',
		'amount',
		'description',
		'memo',
		'date',
		'suggestedExpenseAccountId',
		'suggestedRevenueAccountId',
		'suggestedBankAccountId',
		'suggestedFromAccountId',
		'suggestedToAccountId',
		'referenceNumber',
		'isRecurring',
		'frequency',
		'recurringEndDate',
		'recurringName',
		'confidence'
	],
	additionalProperties: false
} as const;

function getOpenAISchema() {
	return {
		name: 'parsed_transaction',
		strict: true,
		schema: TRANSACTION_SCHEMA
	};
}

function getAnthropicTool() {
	return {
		name: 'parse_transaction',
		description: 'Parse a natural language financial transaction into structured data',
		input_schema: TRANSACTION_SCHEMA
	};
}

function getGeminiSchema(): Record<string, unknown> {
	const typeMap: Record<string, string> = {
		string: 'STRING',
		number: 'NUMBER',
		boolean: 'BOOLEAN',
		object: 'OBJECT',
		array: 'ARRAY'
	};

	function convertProperty(prop: Record<string, unknown>): Record<string, unknown> {
		const t = prop.type;
		if (Array.isArray(t)) {
			const nonNull = t.filter((x: string) => x !== 'null')[0] as string;
			const result: Record<string, unknown> = { type: typeMap[nonNull] || nonNull, nullable: true };
			if (prop.enum) result.enum = (prop.enum as unknown[]).filter((v) => v !== null);
			if (prop.description) result.description = prop.description;
			return result;
		}
		const result: Record<string, unknown> = { type: typeMap[t as string] || t };
		if (prop.enum) result.enum = prop.enum;
		if (prop.description) result.description = prop.description;
		return result;
	}

	const properties: Record<string, unknown> = {};
	for (const [key, val] of Object.entries(TRANSACTION_SCHEMA.properties)) {
		properties[key] = convertProperty(val as Record<string, unknown>);
	}

	return {
		type: 'OBJECT',
		properties,
		required: [...TRANSACTION_SCHEMA.required]
	};
}

// ─── Provider Defaults ──────────────────────────────────────────────────────

const PROVIDER_DEFAULTS: Record<string, { model: string; endpoint: string }> = {
	openai: { model: 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1/chat/completions' },
	anthropic: {
		model: 'claude-haiku-4-5-20251001',
		endpoint: 'https://api.anthropic.com/v1/messages'
	},
	gemini: {
		model: 'gemini-2.0-flash',
		endpoint: 'https://generativelanguage.googleapis.com/v1beta'
	}
};

// ─── Config Loader ──────────────────────────────────────────────────────────

export async function getAIConfig(): Promise<AIConfig | null> {
	const [settings] = await db
		.select({
			aiEnabled: orgSettings.aiEnabled,
			aiProvider: orgSettings.aiProvider,
			aiApiKey: orgSettings.aiApiKey,
			aiModel: orgSettings.aiModel,
			aiEndpoint: orgSettings.aiEndpoint
		})
		.from(orgSettings)
		.where(eq(orgSettings.id, 'default'));

	if (!settings?.aiEnabled || !settings.aiProvider || !settings.aiApiKey) {
		return null;
	}

	const provider = settings.aiProvider as AIConfig['provider'];
	const defaults = PROVIDER_DEFAULTS[provider];

	return {
		provider,
		apiKey: settings.aiApiKey,
		model: settings.aiModel || defaults?.model || '',
		endpoint: settings.aiEndpoint || defaults?.endpoint || ''
	};
}

// ─── Domain Context Builder ─────────────────────────────────────────────────

export function buildDomainContext(accounts: AccountContext[]): string {
	const today = new Date().toISOString().split('T')[0];

	const bankAccounts = accounts.filter(
		(a) => a.accountType === 'asset' && a.accountNumber >= 1000 && a.accountNumber < 1100
	);
	const expenseAccounts = accounts.filter((a) => a.accountType === 'expense');
	const revenueAccounts = accounts.filter((a) => a.accountType === 'revenue');
	const otherAccounts = accounts.filter(
		(a) =>
			!bankAccounts.includes(a) &&
			!expenseAccounts.includes(a) &&
			!revenueAccounts.includes(a)
	);

	function formatAccounts(list: AccountContext[]): string {
		return list.map((a) => `- ID: "${a.id}" | #${a.accountNumber} | "${a.name}"`).join('\n');
	}

	function formatOtherAccounts(list: AccountContext[]): string {
		return list
			.map(
				(a) =>
					`- ID: "${a.id}" | #${a.accountNumber} | "${a.name}" | Type: ${a.accountType}`
			)
			.join('\n');
	}

	return `You are a financial transaction parser for a double-entry bookkeeping system. Parse the user's natural language input into a structured transaction.

Today's date is: ${today}

Available chart of accounts:

BANK/CASH ACCOUNTS (asset accounts for payment):
${bankAccounts.length > 0 ? formatAccounts(bankAccounts) : '(none configured)'}

EXPENSE ACCOUNTS:
${expenseAccounts.length > 0 ? formatAccounts(expenseAccounts) : '(none configured)'}

REVENUE ACCOUNTS:
${revenueAccounts.length > 0 ? formatAccounts(revenueAccounts) : '(none configured)'}

OTHER ACCOUNTS (asset, liability, equity):
${otherAccounts.length > 0 ? formatOtherAccounts(otherAccounts) : '(none)'}

RULES:
1. Determine transactionType: "expense" (money going out), "deposit" (money coming in), or "transfer" (moving between accounts).
2. amount: The dollar amount as a number (e.g. 299.00, not cents).
3. description: A clean, professional description for the journal entry (e.g. "Figma Design Software Subscription").
4. memo: Additional context from the input that adds detail beyond the description. null if nothing extra.
5. date: ISO date string (YYYY-MM-DD). Default to today (${today}) unless the user specifies a date.
6. suggestedBankAccountId: The most appropriate bank/cash account ID. If only one exists, use it.
7. For expenses: set suggestedExpenseAccountId to the best-matching expense account ID.
8. For deposits: set suggestedRevenueAccountId to the best-matching revenue account ID.
9. For transfers: set suggestedFromAccountId and suggestedToAccountId.
10. referenceNumber: Extract invoice numbers, check numbers, or reference IDs if mentioned. Otherwise null.
11. isRecurring: true if the input mentions recurring frequency (monthly, weekly, yearly, subscription, etc.).
12. frequency: One of "daily", "weekly", "biweekly", "monthly", "quarterly", "yearly". Only set if isRecurring is true.
13. recurringEndDate: ISO date if an end date is mentioned, null if indefinite or "until cancelled".
14. recurringName: A descriptive name for the recurring rule (e.g. "Figma Monthly Subscription"). Only set if isRecurring is true.
15. confidence: 0.0 to 1.0 representing parsing confidence. Lower if ambiguous.`;
}

// ─── Provider Callers ───────────────────────────────────────────────────────

async function callOpenAI(
	config: AIConfig,
	domainContext: string,
	userInput: string
): Promise<ParsedTransaction> {
	const res = await fetch(config.endpoint, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: config.model,
			messages: [
				{ role: 'system', content: domainContext },
				{ role: 'user', content: userInput }
			],
			temperature: 0.1,
			response_format: {
				type: 'json_schema',
				json_schema: getOpenAISchema()
			}
		})
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`OpenAI API error (${res.status}): ${text}`);
	}

	const data = await res.json();

	if (data.choices[0].message.refusal) {
		throw new Error(`OpenAI refused: ${data.choices[0].message.refusal}`);
	}

	return JSON.parse(data.choices[0].message.content) as ParsedTransaction;
}

async function callAnthropic(
	config: AIConfig,
	domainContext: string,
	userInput: string
): Promise<ParsedTransaction> {
	const res = await fetch(config.endpoint, {
		method: 'POST',
		headers: {
			'x-api-key': config.apiKey,
			'anthropic-version': '2023-06-01',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: config.model,
			max_tokens: 1024,
			system: domainContext,
			tools: [getAnthropicTool()],
			tool_choice: { type: 'tool', name: 'parse_transaction' },
			messages: [{ role: 'user', content: userInput }]
		})
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Anthropic API error (${res.status}): ${text}`);
	}

	const data = await res.json();
	const toolBlock = data.content.find(
		(block: { type: string }) => block.type === 'tool_use'
	);

	if (!toolBlock) {
		throw new Error('Anthropic did not return a tool_use block');
	}

	return toolBlock.input as ParsedTransaction;
}

async function callGemini(
	config: AIConfig,
	domainContext: string,
	userInput: string
): Promise<ParsedTransaction> {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			system_instruction: { parts: [{ text: domainContext }] },
			contents: [{ parts: [{ text: userInput }] }],
			generationConfig: {
				temperature: 0.1,
				responseMimeType: 'application/json',
				responseSchema: getGeminiSchema()
			}
		})
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Gemini API error (${res.status}): ${text}`);
	}

	const data = await res.json();
	return JSON.parse(data.candidates[0].content.parts[0].text) as ParsedTransaction;
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateTransaction(parsed: ParsedTransaction): ParsedTransaction {
	const today = new Date().toISOString().split('T')[0];
	return {
		transactionType: parsed.transactionType || 'expense',
		amount: typeof parsed.amount === 'number' ? parsed.amount : 0,
		description: parsed.description || 'AI-parsed transaction',
		memo: parsed.memo || null,
		date: parsed.date || today,
		suggestedExpenseAccountId: parsed.suggestedExpenseAccountId || null,
		suggestedRevenueAccountId: parsed.suggestedRevenueAccountId || null,
		suggestedBankAccountId: parsed.suggestedBankAccountId || null,
		suggestedFromAccountId: parsed.suggestedFromAccountId || null,
		suggestedToAccountId: parsed.suggestedToAccountId || null,
		referenceNumber: parsed.referenceNumber || null,
		isRecurring: Boolean(parsed.isRecurring),
		frequency: parsed.frequency || null,
		recurringEndDate: parsed.recurringEndDate || null,
		recurringName: parsed.recurringName || null,
		confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
	};
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export async function parseTransaction(
	input: string,
	accounts: AccountContext[]
): Promise<ParsedTransaction> {
	const config = await getAIConfig();
	if (!config) {
		throw new Error('AI is not configured. Ask an admin to set up an AI provider in Settings.');
	}

	const domainContext = buildDomainContext(accounts);
	let parsed: ParsedTransaction;

	switch (config.provider) {
		case 'openai':
			parsed = await callOpenAI(config, domainContext, input);
			break;
		case 'anthropic':
			parsed = await callAnthropic(config, domainContext, input);
			break;
		case 'gemini':
			parsed = await callGemini(config, domainContext, input);
			break;
		default:
			throw new Error(`Unsupported AI provider: ${config.provider}`);
	}

	return validateTransaction(parsed);
}

// ─── Test Connection ────────────────────────────────────────────────────────

export async function testAIConnection(params: {
	provider: string;
	apiKey: string;
	model: string;
	endpoint: string;
}): Promise<{ valid: boolean; error?: string }> {
	const defaults = PROVIDER_DEFAULTS[params.provider];
	const config: AIConfig = {
		provider: params.provider as AIConfig['provider'],
		apiKey: params.apiKey,
		model: params.model || defaults?.model || '',
		endpoint: params.endpoint || defaults?.endpoint || ''
	};

	try {
		switch (config.provider) {
			case 'openai': {
				const res = await fetch(config.endpoint, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${config.apiKey}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						model: config.model,
						messages: [{ role: 'user', content: 'Reply with "ok"' }],
						max_tokens: 5
					})
				});
				if (!res.ok) throw new Error(`OpenAI (${res.status}): ${await res.text()}`);
				break;
			}
			case 'anthropic': {
				const res = await fetch(config.endpoint, {
					method: 'POST',
					headers: {
						'x-api-key': config.apiKey,
						'anthropic-version': '2023-06-01',
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						model: config.model,
						max_tokens: 5,
						messages: [{ role: 'user', content: 'Reply with "ok"' }]
					})
				});
				if (!res.ok)
					throw new Error(`Anthropic (${res.status}): ${await res.text()}`);
				break;
			}
			case 'gemini': {
				const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
				const res = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						contents: [{ parts: [{ text: 'Reply with "ok"' }] }],
						generationConfig: { maxOutputTokens: 5 }
					})
				});
				if (!res.ok) throw new Error(`Gemini (${res.status}): ${await res.text()}`);
				break;
			}
			default:
				return { valid: false, error: `Unsupported provider: ${config.provider}` };
		}
		return { valid: true };
	} catch (err) {
		return { valid: false, error: err instanceof Error ? err.message : 'Connection failed' };
	}
}
