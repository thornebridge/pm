<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let showVoidDialog = $state(false);
	let voidReason = $state('');
	let processing = $state(false);

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

	function sourceLabel(source: string): string {
		switch (source) {
			case 'manual':
				return 'Manual';
			case 'crm_sync':
				return 'CRM Sync';
			case 'recurring':
				return 'Recurring';
			case 'import':
				return 'Import';
			case 'opening_balance':
				return 'Opening Balance';
			case 'void_reversal':
				return 'Void Reversal';
			default:
				return source;
		}
	}

	const totalDebits = $derived(data.lines.reduce((sum, l) => sum + l.debit, 0));
	const totalCredits = $derived(data.lines.reduce((sum, l) => sum + l.credit, 0));

	async function postEntry() {
		processing = true;
		try {
			await api(`/api/financials/journal-entries/${data.entry.id}/post`, {
				method: 'POST'
			});
			showToast('Entry posted');
			await invalidateAll();
		} catch (err: any) {
			showToast(err.message || 'Failed to post entry', 'error');
		} finally {
			processing = false;
		}
	}

	async function deleteEntry() {
		if (!confirm('Delete this draft entry? This cannot be undone.')) return;
		processing = true;
		try {
			await api(`/api/financials/journal-entries/${data.entry.id}`, {
				method: 'DELETE'
			});
			showToast('Entry deleted');
			goto('/financials/journal-entries');
		} catch (err: any) {
			showToast(err.message || 'Failed to delete entry', 'error');
		} finally {
			processing = false;
		}
	}

	async function voidEntry() {
		if (!voidReason.trim()) {
			showToast('Please provide a reason for voiding', 'error');
			return;
		}
		processing = true;
		try {
			await api(`/api/financials/journal-entries/${data.entry.id}/void`, {
				method: 'POST',
				body: JSON.stringify({
					reason: voidReason.trim()
				})
			});
			showToast('Entry voided');
			showVoidDialog = false;
			voidReason = '';
			await invalidateAll();
		} catch (err: any) {
			showToast(err.message || 'Failed to void entry', 'error');
		} finally {
			processing = false;
		}
	}
</script>

<svelte:head>
	<title>JE-{data.entry.entryNumber} | Journal Entries</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="mb-6">
		<a href="/financials/journal-entries" class="text-sm text-surface-500 hover:text-surface-300">&larr; Journal Entries</a>
		<div class="mt-1 flex items-center gap-3">
			<h1 class="text-xl font-semibold text-surface-100">JE-{data.entry.entryNumber}</h1>
			<span
				class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize {statusClass(data.entry.status)}"
			>
				{data.entry.status}
			</span>
			<span class="inline-flex items-center rounded-full bg-surface-800 px-2 py-0.5 text-[10px] font-medium text-surface-400">
				{sourceLabel(data.entry.source)}
			</span>
		</div>
	</div>

	<!-- Entry Info -->
	<div class="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-surface-800 bg-surface-900 p-4 md:grid-cols-4">
		<div>
			<p class="text-xs text-surface-500">Date</p>
			<p class="text-sm text-surface-100">{formatDate(data.entry.date)}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Description</p>
			<p class="text-sm text-surface-100">{data.entry.description}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Memo</p>
			<p class="text-sm text-surface-100">{data.entry.memo || '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Reference #</p>
			<p class="text-sm text-surface-100">{data.entry.referenceNumber || '\u2014'}</p>
		</div>
	</div>

	<!-- Void info -->
	{#if data.entry.status === 'voided'}
		<div class="mb-6 rounded-lg border border-red-900 bg-red-950/30 p-4">
			<p class="text-sm font-medium text-red-400">This entry has been voided</p>
			{#if data.entry.voidReason}
				<p class="mt-1 text-sm text-red-300">Reason: {data.entry.voidReason}</p>
			{/if}
			{#if data.entry.voidedAt}
				<p class="mt-1 text-xs text-red-400/70">Voided on {formatDate(data.entry.voidedAt)}</p>
			{/if}
			{#if data.reversalEntry}
				<a
					href="/financials/journal-entries/{data.reversalEntry.id}"
					class="mt-2 inline-block text-sm text-red-300 underline hover:text-red-200"
				>
					View reversal entry JE-{data.reversalEntry.entryNumber}
				</a>
			{/if}
		</div>
	{/if}

	<!-- Lines Table -->
	<h2 class="mb-3 text-base font-semibold text-surface-100">Lines</h2>
	<div class="mb-6 overflow-x-auto rounded-lg border border-surface-800">
		<table class="w-full text-left text-sm">
			<thead class="border-b border-surface-800 bg-surface-900">
				<tr>
					<th class="px-4 py-2 font-medium text-surface-300">Account</th>
					<th class="px-4 py-2 text-right font-medium text-surface-300">Debit</th>
					<th class="px-4 py-2 text-right font-medium text-surface-300">Credit</th>
					<th class="px-4 py-2 font-medium text-surface-300">Memo</th>
				</tr>
			</thead>
			<tbody>
				{#each data.lines as line (line.id)}
					<tr class="border-b border-surface-800">
						<td class="px-4 py-2.5">
							<a
								href="/financials/accounts/{line.accountId}"
								class="text-surface-100 hover:text-brand-400"
							>
								{line.accountNumber} - {line.accountName}
							</a>
						</td>
						<td class="px-4 py-2.5 text-right text-surface-100">
							{line.debit > 0 ? formatCents(line.debit) : ''}
						</td>
						<td class="px-4 py-2.5 text-right text-surface-100">
							{line.credit > 0 ? formatCents(line.credit) : ''}
						</td>
						<td class="px-4 py-2.5 text-surface-500">{line.memo || ''}</td>
					</tr>
				{/each}
			</tbody>
			<tfoot class="border-t border-surface-700 bg-surface-900">
				<tr>
					<td class="px-4 py-2 text-right font-medium text-surface-300">Totals</td>
					<td class="px-4 py-2 text-right font-medium text-surface-100">{formatCents(totalDebits)}</td>
					<td class="px-4 py-2 text-right font-medium text-surface-100">{formatCents(totalCredits)}</td>
					<td></td>
				</tr>
			</tfoot>
		</table>
	</div>

	<!-- Action Buttons -->
	<div class="flex gap-3">
		{#if data.entry.status === 'draft'}
			<button
				onclick={postEntry}
				disabled={processing}
				class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
			>
				{processing ? 'Posting...' : 'Post Entry'}
			</button>
			<a
				href="/financials/journal-entries/new"
				class="rounded-md border border-surface-700 px-4 py-2 text-sm text-surface-300 hover:bg-surface-800"
			>
				Edit
			</a>
			<button
				onclick={deleteEntry}
				disabled={processing}
				class="rounded-md border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 disabled:opacity-50"
			>
				Delete
			</button>
		{:else if data.entry.status === 'posted'}
			<button
				onclick={() => (showVoidDialog = true)}
				disabled={processing}
				class="rounded-md border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 disabled:opacity-50"
			>
				Void Entry
			</button>
		{/if}
	</div>
</div>

<!-- Void Dialog -->
{#if showVoidDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
		<div class="w-full max-w-md rounded-lg border border-surface-800 bg-surface-900 p-6 shadow-xl">
			<h2 class="mb-2 text-lg font-semibold text-surface-100">Void Journal Entry</h2>
			<p class="mb-4 text-sm text-surface-500">
				This will create a reversal entry and mark JE-{data.entry.entryNumber} as voided.
				This action cannot be undone.
			</p>

			<div class="mb-4">
				<label for="voidReason" class="mb-1 block text-xs text-surface-500">Reason for voiding</label>
				<textarea
					id="voidReason"
					bind:value={voidReason}
					rows="3"
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
					placeholder="Explain why this entry is being voided..."
				></textarea>
			</div>

			<div class="flex justify-end gap-2">
				<button
					onclick={() => {
						showVoidDialog = false;
						voidReason = '';
					}}
					class="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-800"
				>
					Cancel
				</button>
				<button
					onclick={voidEntry}
					disabled={processing || !voidReason.trim()}
					class="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
				>
					{processing ? 'Voiding...' : 'Void Entry'}
				</button>
			</div>
		</div>
	</div>
{/if}
