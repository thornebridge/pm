<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	function fmt(cents: number) {
		const neg = cents < 0;
		const a = Math.abs(cents);
		return (neg ? '-' : '') + '$' + Math.floor(a / 100).toLocaleString() + '.' + String(a % 100).padStart(2, '0');
	}

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Track which lines are checked (reconciled)
	let checkedLines = $state<Set<string>>(
		new Set(data.lines.filter((l: any) => l.reconciled).map((l: any) => l.lineId))
	);

	function toggleLine(lineId: string) {
		const next = new Set(checkedLines);
		if (next.has(lineId)) {
			next.delete(lineId);
		} else {
			next.add(lineId);
		}
		checkedLines = next;
	}

	// Compute cleared balance: sum of checked lines
	const clearedBalance = $derived.by(() => {
		let total = 0;
		for (const line of data.lines) {
			if (checkedLines.has(line.lineId)) {
				total += line.debit - line.credit;
			}
		}
		return total;
	});

	const statementBalance = $derived(data.recon.statementBalance);
	const difference = $derived(clearedBalance - statementBalance);
	const isReconciled = $derived(difference === 0);
	const isCompleted = $derived(data.recon.status === 'completed');

	// Unreconciled lines only
	const unreconciledLines = $derived(
		data.lines.filter((l: any) => !l.reconciled)
	);
	const reconciledLines = $derived(
		data.lines.filter((l: any) => l.reconciled)
	);

	async function toggleReconciled(lineId: string) {
		toggleLine(lineId);

		try {
			await api(`/api/financials/reconciliations/${data.recon.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ lineIds: [lineId] })
			});
		} catch (err: any) {
			// Revert on error
			toggleLine(lineId);
			showToast(err.message || 'Failed to update line', 'error');
		}
	}

	async function completeReconciliation() {
		if (!isReconciled) {
			showToast('Difference must be zero to complete', 'error');
			return;
		}

		try {
			await api(`/api/financials/reconciliations/${data.recon.id}/complete`, {
				method: 'POST'
			});
			showToast('Reconciliation completed');
			await invalidateAll();
		} catch (err: any) {
			showToast(err.message || 'Failed to complete reconciliation', 'error');
		}
	}
</script>

<svelte:head>
	<title>Reconcile {data.account.name} | Financials</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6">
		<a href="/financials/reconciliation" class="text-sm text-surface-500 hover:text-surface-300">&larr; Reconciliation</a>
		<h1 class="mt-1 text-xl font-semibold text-surface-100">
			Reconcile: {data.account.accountNumber} - {data.account.name}
		</h1>
		<p class="mt-1 text-sm text-surface-500">
			Statement date: {formatDate(data.recon.statementDate)}
		</p>
	</div>

	<!-- Summary Cards -->
	<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
		<div class="rounded-lg border border-surface-800 bg-surface-900 p-4">
			<p class="text-xs text-surface-500">Statement Balance</p>
			<p class="mt-1 text-xl font-bold text-surface-100">{fmt(statementBalance)}</p>
		</div>
		<div class="rounded-lg border border-surface-800 bg-surface-900 p-4">
			<p class="text-xs text-surface-500">Cleared Balance</p>
			<p class="mt-1 text-xl font-bold text-surface-100">{fmt(clearedBalance)}</p>
		</div>
		<div class="rounded-lg border p-4 {isReconciled ? 'border-green-800 bg-green-900/20' : 'border-red-800 bg-red-900/20'}">
			<p class="text-xs text-surface-500">Difference</p>
			<p class="mt-1 text-xl font-bold {isReconciled ? 'text-green-400' : 'text-red-400'}">
				{fmt(difference)}
			</p>
		</div>
	</div>

	{#if isCompleted}
		<div class="mb-6 rounded-lg border border-green-800 bg-green-900/20 p-4 text-center">
			<p class="text-sm font-medium text-green-400">This reconciliation has been completed.</p>
		</div>
	{/if}

	<!-- Unreconciled Transactions -->
	{#if unreconciledLines.length > 0}
		<h2 class="mb-2 text-base font-semibold text-surface-100">Unreconciled Transactions</h2>
		<div class="mb-6 overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="w-10 px-4 py-2"></th>
						<th class="px-4 py-2 font-medium text-surface-300">Date</th>
						<th class="px-4 py-2 font-medium text-surface-300">Entry #</th>
						<th class="px-4 py-2 font-medium text-surface-300">Description</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Debit</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Credit</th>
					</tr>
				</thead>
				<tbody>
					{#each unreconciledLines as line}
						<tr class="border-b border-surface-800 hover:bg-surface-800/50">
							<td class="px-4 py-2.5 text-center">
								<input
									type="checkbox"
									checked={checkedLines.has(line.lineId)}
									onchange={() => toggleReconciled(line.lineId)}
									disabled={isCompleted}
									class="rounded border-surface-700 bg-surface-800"
								/>
							</td>
							<td class="px-4 py-2.5 text-surface-300">{formatDate(line.date)}</td>
							<td class="px-4 py-2.5 font-medium text-surface-100">JE-{line.entryNumber}</td>
							<td class="px-4 py-2.5 text-surface-100">{line.description}</td>
							<td class="px-4 py-2.5 text-right text-surface-100">
								{line.debit > 0 ? fmt(line.debit) : ''}
							</td>
							<td class="px-4 py-2.5 text-right text-surface-100">
								{line.credit > 0 ? fmt(line.credit) : ''}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Already Reconciled -->
	{#if reconciledLines.length > 0}
		<h2 class="mb-2 text-base font-semibold text-surface-100">Reconciled Transactions</h2>
		<div class="mb-6 overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="w-10 px-4 py-2"></th>
						<th class="px-4 py-2 font-medium text-surface-300">Date</th>
						<th class="px-4 py-2 font-medium text-surface-300">Entry #</th>
						<th class="px-4 py-2 font-medium text-surface-300">Description</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Debit</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Credit</th>
					</tr>
				</thead>
				<tbody>
					{#each reconciledLines as line}
						<tr class="border-b border-surface-800 opacity-60">
							<td class="px-4 py-2.5 text-center">
								<input
									type="checkbox"
									checked={true}
									onchange={() => toggleReconciled(line.lineId)}
									disabled={isCompleted}
									class="rounded border-surface-700 bg-surface-800"
								/>
							</td>
							<td class="px-4 py-2.5 text-surface-300">{formatDate(line.date)}</td>
							<td class="px-4 py-2.5 font-medium text-surface-100">JE-{line.entryNumber}</td>
							<td class="px-4 py-2.5 text-surface-100">{line.description}</td>
							<td class="px-4 py-2.5 text-right text-surface-100">
								{line.debit > 0 ? fmt(line.debit) : ''}
							</td>
							<td class="px-4 py-2.5 text-right text-surface-100">
								{line.credit > 0 ? fmt(line.credit) : ''}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Complete Button -->
	{#if !isCompleted}
		<button
			onclick={completeReconciliation}
			disabled={!isReconciled}
			class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-30 disabled:cursor-not-allowed"
		>
			Complete Reconciliation
		</button>
	{/if}
</div>
