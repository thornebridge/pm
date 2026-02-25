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

// ─── Provider Defaults ──────────────────────────────────────────────────────

const PROVIDER_DEFAULTS: Record<string, { model: string; endpoint: string }> = {
	openai: { model: 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1/chat/completions' },
	anthropic: { model: 'claude-sonnet-4-20250514', endpoint: 'https://api.anthropic.com/v1/messages' },
	gemini: { model: 'gemini-2.0-flash', endpoint: 'https://generativelanguage.googleapis.com/v1beta' }
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

// ─── System Prompt Builder ──────────────────────────────────────────────────

export function buildSystemPrompt(accounts: AccountContext[]): string {
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
		return list.map((a) => `- ID: "${a.id}" | #${a.accountNumber} | "${a.name}" | Type: ${a.accountType}`).join('\n');
	}

	return `You are a financial transaction parser for a double-entry bookkeeping system. Parse the user's natural language input into a structured JSON transaction.

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
1. Respond with ONLY a valid JSON object, no other text or markdown.
2. Determine transactionType: "expense" (money going out), "deposit" (money coming in), or "transfer" (moving between accounts).
3. amount: The dollar amount as a number (e.g. 299.00, not cents).
4. description: A clean, professional description for the journal entry (e.g. "Figma Design Software Subscription").
5. memo: Additional context from the input that adds detail beyond the description. null if nothing extra.
6. date: ISO date string (YYYY-MM-DD). Default to today (${today}) unless the user specifies a date.
7. suggestedBankAccountId: The most appropriate bank/cash account ID. If only one exists, use it.
8. For expenses: set suggestedExpenseAccountId to the best-matching expense account ID.
9. For deposits: set suggestedRevenueAccountId to the best-matching revenue account ID.
10. For transfers: set suggestedFromAccountId and suggestedToAccountId.
11. referenceNumber: Extract invoice numbers, check numbers, or reference IDs if mentioned. Otherwise null.
12. isRecurring: true if the input mentions recurring frequency (monthly, weekly, yearly, subscription, etc.).
13. frequency: One of "daily", "weekly", "biweekly", "monthly", "quarterly", "yearly". Only set if isRecurring is true.
14. recurringEndDate: ISO date if an end date is mentioned, null if indefinite or "until cancelled".
15. recurringName: A descriptive name for the recurring rule (e.g. "Figma Monthly Subscription"). Only set if isRecurring is true.
16. confidence: 0.0 to 1.0 representing parsing confidence. Lower if ambiguous.

JSON SCHEMA:
{
  "transactionType": "expense" | "deposit" | "transfer",
  "amount": number,
  "description": string,
  "memo": string | null,
  "date": "YYYY-MM-DD",
  "suggestedExpenseAccountId": string | null,
  "suggestedRevenueAccountId": string | null,
  "suggestedBankAccountId": string | null,
  "suggestedFromAccountId": string | null,
  "suggestedToAccountId": string | null,
  "referenceNumber": string | null,
  "isRecurring": boolean,
  "frequency": string | null,
  "recurringEndDate": string | null,
  "recurringName": string | null,
  "confidence": number
}`;
}

// ─── Provider Callers ───────────────────────────────────────────────────────

async function callOpenAI(config: AIConfig, systemPrompt: string, userInput: string): Promise<string> {
	const res = await fetch(config.endpoint, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: config.model,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userInput }
			],
			temperature: 0.1,
			response_format: { type: 'json_object' }
		})
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`OpenAI API error (${res.status}): ${text}`);
	}

	const data = await res.json();
	return data.choices[0].message.content;
}

async function callAnthropic(config: AIConfig, systemPrompt: string, userInput: string): Promise<string> {
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
			system: systemPrompt,
			messages: [{ role: 'user', content: userInput }]
		})
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Anthropic API error (${res.status}): ${text}`);
	}

	const data = await res.json();
	return data.content[0].text;
}

async function callGemini(config: AIConfig, systemPrompt: string, userInput: string): Promise<string> {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			system_instruction: { parts: [{ text: systemPrompt }] },
			contents: [{ parts: [{ text: userInput }] }],
			generationConfig: {
				temperature: 0.1,
				responseMimeType: 'application/json'
			}
		})
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Gemini API error (${res.status}): ${text}`);
	}

	const data = await res.json();
	return data.candidates[0].content.parts[0].text;
}

// ─── JSON Extraction ────────────────────────────────────────────────────────

function extractJSON(raw: string): ParsedTransaction {
	const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
	const parsed = JSON.parse(cleaned);
	const today = new Date().toISOString().split('T')[0];

	return {
		transactionType: parsed.transactionType || 'expense',
		amount: typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount) || 0,
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

export async function parseTransaction(input: string, accounts: AccountContext[]): Promise<ParsedTransaction> {
	const config = await getAIConfig();
	if (!config) {
		throw new Error('AI is not configured. Ask an admin to set up an AI provider in Settings.');
	}

	const systemPrompt = buildSystemPrompt(accounts);
	let raw: string;

	switch (config.provider) {
		case 'openai':
			raw = await callOpenAI(config, systemPrompt, input);
			break;
		case 'anthropic':
			raw = await callAnthropic(config, systemPrompt, input);
			break;
		case 'gemini':
			raw = await callGemini(config, systemPrompt, input);
			break;
		default:
			throw new Error(`Unsupported AI provider: ${config.provider}`);
	}

	return extractJSON(raw);
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
		let raw: string;
		const testPrompt = 'Respond with exactly: {"status":"ok"}';

		switch (config.provider) {
			case 'openai':
				raw = await callOpenAI(config, 'You are a test assistant.', testPrompt);
				break;
			case 'anthropic':
				raw = await callAnthropic(config, 'You are a test assistant.', testPrompt);
				break;
			case 'gemini':
				raw = await callGemini(config, 'You are a test assistant.', testPrompt);
				break;
			default:
				return { valid: false, error: `Unsupported provider: ${config.provider}` };
		}

		return { valid: true };
	} catch (err) {
		return { valid: false, error: err instanceof Error ? err.message : 'Connection failed' };
	}
}
