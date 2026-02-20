<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	interface JournalLine {
		accountId: string;
		debit: string;
		credit: string;
		memo: string;
	}

	let date = $state(new Date().toISOString().split('T')[0]);
	let description = $state('');
	let memo = $state('');
	let referenceNumber = $state('');
	let lines = $state<JournalLine[]>([
		{ accountId: '', debit: '', credit: '', memo: '' },
		{ accountId: '', debit: '', credit: '', memo: '' }
	]);
	let saving = $state(false);

	function addLine() {
		lines = [...lines, { accountId: '', debit: '', credit: '', memo: '' }];
	}

	function removeLine(index: number) {
		if (lines.length <= 2) return;
		lines = lines.filter((_, i) => i !== index);
	}

	const totalDebits = $derived.by(() => {
		return lines.reduce((sum, l) => {
			const val = parseFloat(l.debit);
			return sum + (isNaN(val) ? 0 : Math.round(val * 100));
		}, 0);
	});

	const totalCredits = $derived.by(() => {
		return lines.reduce((sum, l) => {
			const val = parseFloat(l.credit);
			return sum + (isNaN(val) ? 0 : Math.round(val * 100));
		}, 0);
	});

	const difference = $derived(totalDebits - totalCredits);
	const isBalanced = $derived(difference === 0 && totalDebits > 0);

	function formatCents(val: number): string {
		const abs = Math.abs(val);
		return `$${Math.floor(abs / 100).toLocaleString()}.${String(abs % 100).padStart(2, '0')}`;
	}

	async function submit(status: 'draft' | 'posted') {
		if (!date) {
			showToast('Date is required', 'error');
			return;
		}
		if (!description.trim()) {
			showToast('Description is required', 'error');
			return;
		}

		const validLines = lines.filter((l) => l.accountId);
		if (validLines.length < 2) {
			showToast('At least 2 lines with accounts are required', 'error');
			return;
		}

		if (!isBalanced) {
			showToast('Debits must equal credits', 'error');
			return;
		}

		saving = true;
		try {
			const payload = {
				date: new Date(date).getTime(),
				description: description.trim(),
				memo: memo.trim() || null,
				referenceNumber: referenceNumber.trim() || null,
				status,
				lines: validLines.map((l) => ({
					accountId: l.accountId,
					debit: Math.round(parseFloat(l.debit || '0') * 100),
					credit: Math.round(parseFloat(l.credit || '0') * 100),
					memo: l.memo.trim() || null
				}))
			};

			const result: { id: string } = await api('/api/financials/journal-entries', {
				method: 'POST',
				body: JSON.stringify(payload)
			});

			showToast(status === 'posted' ? 'Entry posted' : 'Draft saved');
			goto(`/financials/journal-entries/${result.id}`);
		} catch (err: any) {
			showToast(err.message || 'Failed to save entry', 'error');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>New Journal Entry | Financials</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6">
		<a href="/financials/journal-entries" class="text-sm text-surface-500 hover:text-surface-300">&larr; Journal Entries</a>
		<h1 class="mt-1 text-xl font-semibold text-surface-100">New Journal Entry</h1>
	</div>

	<!-- Header fields -->
	<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div>
			<label for="jeDate" class="mb-1 block text-xs text-surface-500">Date</label>
			<input
				id="jeDate"
				type="date"
				bind:value={date}
				class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
			/>
		</div>
		<div>
			<label for="jeDesc" class="mb-1 block text-xs text-surface-500">Description</label>
			<input
				id="jeDesc"
				type="text"
				bind:value={description}
				placeholder="Entry description"
				class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none placeholder:text-surface-500 focus:border-brand-500"
			/>
		</div>
		<div>
			<label for="jeMemo" class="mb-1 block text-xs text-surface-500">Memo (optional)</label>
			<input
				id="jeMemo"
				type="text"
				bind:value={memo}
				class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
			/>
		</div>
		<div>
			<label for="jeRef" class="mb-1 block text-xs text-surface-500">Reference # (optional)</label>
			<input
				id="jeRef"
				type="text"
				bind:value={referenceNumber}
				class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
			/>
		</div>
	</div>

	<!-- Journal Lines -->
	<div class="mb-4 overflow-x-auto rounded-lg border border-surface-800">
		<table class="w-full text-left text-sm">
			<thead class="border-b border-surface-800 bg-surface-900">
				<tr>
					<th class="px-4 py-2 font-medium text-surface-300">Account</th>
					<th class="w-36 px-4 py-2 font-medium text-surface-300">Debit ($)</th>
					<th class="w-36 px-4 py-2 font-medium text-surface-300">Credit ($)</th>
					<th class="px-4 py-2 font-medium text-surface-300">Line Memo</th>
					<th class="w-12 px-4 py-2"></th>
				</tr>
			</thead>
			<tbody>
				{#each lines as line, i}
					<tr class="border-b border-surface-800">
						<td class="px-4 py-2">
							<select
								bind:value={line.accountId}
								class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
							>
								<option value="">Select account...</option>
								{#each data.accounts as account}
									<option value={account.id}>{account.accountNumber} - {account.name}</option>
								{/each}
							</select>
						</td>
						<td class="px-4 py-2">
							<input
								type="number"
								step="0.01"
								min="0"
								bind:value={line.debit}
								placeholder="0.00"
								disabled={parseFloat(line.credit) > 0}
								class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500 disabled:opacity-40"
							/>
						</td>
						<td class="px-4 py-2">
							<input
								type="number"
								step="0.01"
								min="0"
								bind:value={line.credit}
								placeholder="0.00"
								disabled={parseFloat(line.debit) > 0}
								class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500 disabled:opacity-40"
							/>
						</td>
						<td class="px-4 py-2">
							<input
								type="text"
								bind:value={line.memo}
								placeholder="Optional"
								class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100 outline-none placeholder:text-surface-500 focus:border-brand-500"
							/>
						</td>
						<td class="px-4 py-2 text-center">
							{#if lines.length > 2}
								<button
									onclick={() => removeLine(i)}
									class="text-xs text-red-500 hover:text-red-400"
									title="Remove line"
								>
									&times;
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
			<tfoot class="border-t border-surface-700 bg-surface-900">
				<tr>
					<td class="px-4 py-2 text-right font-medium text-surface-300">Totals</td>
					<td class="px-4 py-2 font-medium text-surface-100">{formatCents(totalDebits)}</td>
					<td class="px-4 py-2 font-medium text-surface-100">{formatCents(totalCredits)}</td>
					<td colspan="2" class="px-4 py-2">
						{#if difference !== 0}
							<span class="text-sm font-medium text-red-400">
								Difference: {difference > 0 ? '+' : '-'}{formatCents(difference)}
							</span>
						{:else if totalDebits > 0}
							<span class="text-sm font-medium text-green-400">Balanced</span>
						{/if}
					</td>
				</tr>
			</tfoot>
		</table>
	</div>

	<div class="mb-6">
		<button
			onclick={addLine}
			class="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-800"
		>
			+ Add Line
		</button>
	</div>

	<!-- Action Buttons -->
	<div class="flex gap-3">
		<button
			onclick={() => submit('draft')}
			disabled={saving || totalDebits === 0}
			class="rounded-md border border-surface-700 px-4 py-2 text-sm font-medium text-surface-300 hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed"
		>
			{saving ? 'Saving...' : 'Save as Draft'}
		</button>
		<button
			onclick={() => submit('posted')}
			disabled={saving || !isBalanced}
			class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-30 disabled:cursor-not-allowed"
		>
			{saving ? 'Saving...' : 'Save & Post'}
		</button>
	</div>
</div>
