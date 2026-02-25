<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	function formatCents(val: number): string {
		const abs = Math.abs(val);
		return `$${Math.floor(abs / 100).toLocaleString()}.${String(abs % 100).padStart(2, '0')}`;
	}

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function statusClass(status: string): string {
		switch (status) {
			case 'posted':
				return 'bg-green-900/30 text-green-400';
			case 'draft':
				return 'bg-yellow-900/30 text-yellow-400';
			case 'voided':
				return 'bg-red-900/30 text-red-400';
			default:
				return 'bg-surface-700 text-surface-400';
		}
	}

	const netIncome = $derived(data.revenueMTD - data.expensesMTD);

	const cards = $derived([
		{
			title: 'Cash Balance',
			value: data.cashBalance,
			color: data.cashBalance >= 0 ? 'text-green-400' : 'text-red-400'
		},
		{
			title: 'Accounts Receivable',
			value: data.arBalance,
			color: 'text-blue-400'
		},
		{
			title: 'Accounts Payable',
			value: data.apBalance,
			color: 'text-orange-400'
		},
		{
			title: 'Revenue (MTD)',
			value: data.revenueMTD,
			color: 'text-green-400'
		},
		{
			title: 'Expenses (MTD)',
			value: data.expensesMTD,
			color: 'text-red-400'
		},
		{
			title: 'Net Income (MTD)',
			value: netIncome,
			color: netIncome >= 0 ? 'text-green-400' : 'text-red-400'
		}
	]);

	// ─── AI Quick Entry State ─────────────────────────────────────────────────

	interface ParsedResult {
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
		frequency: string | null;
		recurringEndDate: string | null;
		recurringName: string | null;
		confidence: number;
	}

	let aiInput = $state('');
	let aiParsing = $state(false);
	let aiError = $state('');
	let aiConfirming = $state(false);
	let aiPreview = $state<ParsedResult | null>(null);

	// Editable preview fields
	let previewType = $state<'expense' | 'deposit' | 'transfer'>('expense');
	let previewAmount = $state('');
	let previewDescription = $state('');
	let previewMemo = $state('');
	let previewDate = $state('');
	let previewBankAccountId = $state('');
	let previewExpenseAccountId = $state('');
	let previewRevenueAccountId = $state('');
	let previewFromAccountId = $state('');
	let previewToAccountId = $state('');
	let previewReferenceNumber = $state('');
	let previewIsRecurring = $state(false);
	let previewFrequency = $state('');
	let previewRecurringEndDate = $state('');
	let previewRecurringName = $state('');

	async function parseAIInput() {
		if (!aiInput.trim()) return;
		aiParsing = true;
		aiError = '';
		aiPreview = null;
		try {
			const result = await api<ParsedResult>('/api/financials/ai-parse', {
				method: 'POST',
				body: JSON.stringify({ input: aiInput.trim() })
			});
			aiPreview = result;
			previewType = result.transactionType;
			previewAmount = result.amount.toFixed(2);
			previewDescription = result.description;
			previewMemo = result.memo || '';
			previewDate = result.date;
			previewBankAccountId = result.suggestedBankAccountId || (data.bankAccounts[0]?.id ?? '');
			previewExpenseAccountId = result.suggestedExpenseAccountId || '';
			previewRevenueAccountId = result.suggestedRevenueAccountId || '';
			previewFromAccountId = result.suggestedFromAccountId || '';
			previewToAccountId = result.suggestedToAccountId || '';
			previewReferenceNumber = result.referenceNumber || '';
			previewIsRecurring = result.isRecurring;
			previewFrequency = result.frequency || 'monthly';
			previewRecurringEndDate = result.recurringEndDate || '';
			previewRecurringName = result.recurringName || '';
		} catch (err) {
			aiError = err instanceof Error ? err.message : 'Failed to parse input';
		} finally {
			aiParsing = false;
		}
	}

	async function confirmAIEntry() {
		aiConfirming = true;
		try {
			const result = await api<{ id: string; entryNumber: number; recurringRuleId: string | null }>(
				'/api/financials/ai-confirm',
				{
					method: 'POST',
					body: JSON.stringify({
						transactionType: previewType,
						amount: parseFloat(previewAmount),
						description: previewDescription,
						memo: previewMemo || null,
						date: previewDate,
						bankAccountId: previewBankAccountId || undefined,
						expenseAccountId: previewExpenseAccountId || undefined,
						revenueAccountId: previewRevenueAccountId || undefined,
						fromAccountId: previewFromAccountId || undefined,
						toAccountId: previewToAccountId || undefined,
						referenceNumber: previewReferenceNumber || undefined,
						isRecurring: previewIsRecurring,
						frequency: previewIsRecurring ? previewFrequency : undefined,
						recurringEndDate: previewIsRecurring && previewRecurringEndDate ? previewRecurringEndDate : undefined,
						recurringName: previewIsRecurring ? previewRecurringName : undefined
					})
				}
			);
			let msg = `Entry JE-${result.entryNumber} created & posted`;
			if (result.recurringRuleId) msg += ' + recurring rule created';
			showToast(msg);
			aiInput = '';
			aiPreview = null;
			invalidateAll();
		} catch (err) {
			showToast(err instanceof Error ? err.message : 'Failed to create entry', 'error');
		} finally {
			aiConfirming = false;
		}
	}

	function cancelPreview() {
		aiPreview = null;
		aiError = '';
	}

	const inputClasses = 'w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500';
	const selectClasses = 'w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500';
	const labelClasses = 'mb-1 block text-xs text-surface-500';
</script>

<svelte:head>
	<title>Financial Dashboard</title>
</svelte:head>

<div class="p-6">
	<h1 class="mb-6 text-xl font-semibold text-surface-100">Financial Dashboard</h1>

	<!-- AI Quick Entry -->
	{#if data.aiEnabled}
		<div class="mb-8 rounded-lg border border-surface-800 bg-surface-900 p-5">
			<div class="mb-3 flex items-center gap-2">
				<svg class="h-4 w-4 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
				</svg>
				<h2 class="text-base font-semibold text-surface-100">AI Quick Entry</h2>
			</div>
			<p class="mb-3 text-xs text-surface-500">Describe a transaction in plain English and AI will parse it into a journal entry.</p>

			<div class="flex gap-2">
				<textarea
					bind:value={aiInput}
					onkeydown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) parseAIInput(); }}
					placeholder='e.g. "Paid $299/mo for Figma subscription, recurring monthly, for design work"'
					rows={2}
					class="flex-1 resize-none rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 outline-none focus:border-brand-500"
				></textarea>
				<button
					onclick={parseAIInput}
					disabled={aiParsing || !aiInput.trim()}
					class="self-end rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
				>
					{aiParsing ? 'Parsing...' : 'Parse'}
				</button>
			</div>

			{#if aiError}
				<p class="mt-2 text-sm text-red-400">{aiError}</p>
			{/if}

			{#if aiPreview}
				<div class="mt-4 space-y-3 rounded-lg border border-surface-700 bg-surface-800 p-4">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-medium text-surface-100">Preview</h3>
						{#if aiPreview.confidence < 0.7}
							<span class="text-[10px] font-medium text-yellow-400">Low confidence — please verify fields</span>
						{/if}
					</div>

					<!-- Type -->
					<div>
						<label class={labelClasses}>Type
						<select bind:value={previewType} class={selectClasses}>
							<option value="expense">Expense</option>
							<option value="deposit">Deposit</option>
							<option value="transfer">Transfer</option>
						</select>
					</label>
					</div>

					<!-- Amount + Date -->
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class={labelClasses}>Amount ($)
								<input type="number" step="0.01" min="0" bind:value={previewAmount} class={inputClasses} />
							</label>
						</div>
						<div>
							<label class={labelClasses}>Date
								<input type="date" bind:value={previewDate} class={inputClasses} />
							</label>
						</div>
					</div>

					<!-- Description + Memo -->
					<div>
						<label class={labelClasses}>Description
							<input type="text" bind:value={previewDescription} class={inputClasses} />
						</label>
					</div>
					{#if previewMemo || previewType}
						<div>
							<label class={labelClasses}>Memo
								<input type="text" bind:value={previewMemo} placeholder="Optional notes" class={inputClasses} />
							</label>
						</div>
					{/if}

					<!-- Account selectors -->
					{#if previewType === 'expense'}
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class={labelClasses}>Bank Account
									<select bind:value={previewBankAccountId} class={selectClasses}>
										<option value="">Select...</option>
										{#each data.bankAccounts as a}
											<option value={a.id}>{a.accountNumber} - {a.name}</option>
										{/each}
									</select>
								</label>
							</div>
							<div>
								<label class={labelClasses}>Expense Account
									<select bind:value={previewExpenseAccountId} class={selectClasses}>
										<option value="">Select...</option>
										{#each data.expenseAccounts as a}
											<option value={a.id}>{a.accountNumber} - {a.name}</option>
										{/each}
									</select>
								</label>
							</div>
						</div>
					{:else if previewType === 'deposit'}
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class={labelClasses}>Bank Account
									<select bind:value={previewBankAccountId} class={selectClasses}>
										<option value="">Select...</option>
										{#each data.bankAccounts as a}
											<option value={a.id}>{a.accountNumber} - {a.name}</option>
										{/each}
									</select>
								</label>
							</div>
							<div>
								<label class={labelClasses}>Revenue Account
									<select bind:value={previewRevenueAccountId} class={selectClasses}>
										<option value="">Select...</option>
										{#each data.revenueAccounts as a}
											<option value={a.id}>{a.accountNumber} - {a.name}</option>
										{/each}
									</select>
								</label>
							</div>
						</div>
					{:else if previewType === 'transfer'}
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class={labelClasses}>From Account
									<select bind:value={previewFromAccountId} class={selectClasses}>
										<option value="">Select...</option>
										{#each data.bankAccounts as a}
											<option value={a.id}>{a.accountNumber} - {a.name}</option>
										{/each}
									</select>
								</label>
							</div>
							<div>
								<label class={labelClasses}>To Account
									<select bind:value={previewToAccountId} class={selectClasses}>
										<option value="">Select...</option>
										{#each data.bankAccounts as a}
											<option value={a.id}>{a.accountNumber} - {a.name}</option>
										{/each}
									</select>
								</label>
							</div>
						</div>
					{/if}

					<!-- Reference -->
					{#if previewReferenceNumber}
						<div>
							<label class={labelClasses}>Reference #
								<input type="text" bind:value={previewReferenceNumber} class={inputClasses} />
							</label>
						</div>
					{/if}

					<!-- Recurring -->
					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={previewIsRecurring}
							id="ai-recurring"
							class="h-3.5 w-3.5 rounded border-surface-600 bg-surface-700 text-brand-500 focus:ring-brand-500"
						/>
						<label for="ai-recurring" class="text-xs text-surface-300">Recurring transaction</label>
					</div>

					{#if previewIsRecurring}
						<div class="grid grid-cols-3 gap-3">
							<div>
								<label class={labelClasses}>Frequency
									<select bind:value={previewFrequency} class={selectClasses}>
										<option value="daily">Daily</option>
										<option value="weekly">Weekly</option>
										<option value="biweekly">Biweekly</option>
										<option value="monthly">Monthly</option>
										<option value="quarterly">Quarterly</option>
										<option value="yearly">Yearly</option>
									</select>
								</label>
							</div>
							<div>
								<label class={labelClasses}>End Date
									<input type="date" bind:value={previewRecurringEndDate} placeholder="Leave empty for indefinite" class={inputClasses} />
								</label>
							</div>
							<div>
								<label class={labelClasses}>Rule Name
									<input type="text" bind:value={previewRecurringName} class={inputClasses} />
								</label>
							</div>
						</div>
					{/if}

					<!-- Actions -->
					<div class="flex gap-2 pt-1">
						<button
							onclick={confirmAIEntry}
							disabled={aiConfirming || !previewAmount || !previewDescription}
							class="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
						>
							{aiConfirming ? 'Creating...' : 'Confirm & Post'}
						</button>
						<button
							onclick={cancelPreview}
							class="rounded-md border border-surface-700 px-4 py-1.5 text-sm text-surface-300 hover:bg-surface-700"
						>
							Cancel
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Summary Cards -->
	<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each cards as card}
			<div class="rounded-lg border border-surface-800 bg-surface-900 p-4">
				<p class="text-sm text-surface-500">{card.title}</p>
				<p class="mt-1 text-2xl font-bold {card.color}">
					{card.value < 0 ? '-' : ''}{formatCents(card.value)}
				</p>
			</div>
		{/each}
	</div>

	<!-- Recent Journal Entries -->
	<h2 class="mb-3 text-base font-semibold text-surface-100">Recent Journal Entries</h2>

	{#if data.recentEntries.length === 0}
		<p class="text-sm text-surface-500">No journal entries yet.</p>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="px-4 py-2 font-medium text-surface-300">Entry #</th>
						<th class="px-4 py-2 font-medium text-surface-300">Date</th>
						<th class="px-4 py-2 font-medium text-surface-300">Description</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Amount</th>
						<th class="px-4 py-2 font-medium text-surface-300">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each data.recentEntries as entry (entry.id)}
						{@const totalDebits = entry.lines.reduce((sum, l) => sum + l.debit, 0)}
						<tr
							class="cursor-pointer border-b border-surface-800 hover:bg-surface-800/50"
							onclick={() => (window.location.href = `/financials/journal-entries/${entry.id}`)}
						>
							<td class="px-4 py-2.5 font-medium text-surface-100">JE-{entry.entryNumber}</td>
							<td class="px-4 py-2.5 text-surface-300">{formatDate(entry.date)}</td>
							<td class="px-4 py-2.5 text-surface-100">{entry.description}</td>
							<td class="px-4 py-2.5 text-right text-surface-100">{formatCents(totalDebits)}</td>
							<td class="px-4 py-2.5">
								<span
									class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize {statusClass(entry.status)}"
								>
									{entry.status}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
