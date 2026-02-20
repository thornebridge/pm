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

	function statusBadge(status: string): string {
		switch (status) {
			case 'completed':
				return 'bg-green-900/30 text-green-400';
			case 'in_progress':
				return 'bg-yellow-900/30 text-yellow-400';
			default:
				return 'bg-surface-700 text-surface-400';
		}
	}

	// Start reconciliation modal
	let showStartModal = $state(false);
	let newRecon = $state({
		bankAccountId: '',
		statementDate: new Date().toISOString().split('T')[0],
		statementBalance: ''
	});
	let starting = $state(false);

	async function startReconciliation() {
		if (!newRecon.bankAccountId) {
			showToast('Select a bank account', 'error');
			return;
		}
		const balanceNum = parseFloat(newRecon.statementBalance);
		if (isNaN(balanceNum)) {
			showToast('Enter a valid statement balance', 'error');
			return;
		}

		starting = true;
		try {
			const result: { id: string; bankAccountId: string } = await api('/api/financials/reconciliations', {
				method: 'POST',
				body: JSON.stringify({
					bankAccountId: newRecon.bankAccountId,
					statementDate: new Date(newRecon.statementDate).getTime(),
					statementBalance: Math.round(balanceNum * 100)
				})
			});

			showToast('Reconciliation started');
			showStartModal = false;
			goto(`/financials/reconciliation/${result.bankAccountId}`);
		} catch (err: any) {
			showToast(err.message || 'Failed to start reconciliation', 'error');
		} finally {
			starting = false;
		}
	}
</script>

<svelte:head>
	<title>Reconciliation | Financials</title>
</svelte:head>

<div class="p-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-xl font-semibold text-surface-100">Bank Reconciliation</h1>
		<button
			onclick={() => (showStartModal = true)}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
		>
			Start Reconciliation
		</button>
	</div>

	{#if data.reconciliations.length === 0}
		<p class="text-sm text-surface-500">No reconciliations yet. Start one to match your books against a bank statement.</p>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-800 bg-surface-900">
					<tr>
						<th class="px-4 py-2 font-medium text-surface-300">Bank Account</th>
						<th class="px-4 py-2 font-medium text-surface-300">Statement Date</th>
						<th class="px-4 py-2 text-right font-medium text-surface-300">Statement Balance</th>
						<th class="px-4 py-2 font-medium text-surface-300">Status</th>
						<th class="px-4 py-2 font-medium text-surface-300">Completed</th>
					</tr>
				</thead>
				<tbody>
					{#each data.reconciliations as recon (recon.id)}
						<tr
							class="cursor-pointer border-b border-surface-800 hover:bg-surface-800/50"
							onclick={() => (window.location.href = `/financials/reconciliation/${recon.bankAccountId}`)}
						>
							<td class="px-4 py-2.5 text-surface-100">
								<span class="font-mono text-surface-500">{recon.bankAccountNumber}</span>
								{recon.bankAccountName}
							</td>
							<td class="px-4 py-2.5 text-surface-300">{formatDate(recon.statementDate)}</td>
							<td class="px-4 py-2.5 text-right text-surface-100">{fmt(recon.statementBalance)}</td>
							<td class="px-4 py-2.5">
								<span
									class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize {statusBadge(recon.status)}"
								>
									{recon.status.replace('_', ' ')}
								</span>
							</td>
							<td class="px-4 py-2.5 text-surface-500">
								{recon.completedAt ? formatDate(recon.completedAt) : '\u2014'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Start Reconciliation Modal -->
{#if showStartModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
		<div class="w-full max-w-md rounded-lg border border-surface-800 bg-surface-900 p-6 shadow-xl">
			<h2 class="mb-4 text-lg font-semibold text-surface-100">Start Reconciliation</h2>

			<div class="space-y-3">
				<div>
					<label for="reconAccount" class="mb-1 block text-xs text-surface-500">Bank Account</label>
					<select
						id="reconAccount"
						bind:value={newRecon.bankAccountId}
						class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
					>
						<option value="">Select bank account...</option>
						{#each data.bankAccounts as account}
							<option value={account.id}>{account.accountNumber} - {account.name}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="reconDate" class="mb-1 block text-xs text-surface-500">Statement Date</label>
					<input
						id="reconDate"
						type="date"
						bind:value={newRecon.statementDate}
						class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
					/>
				</div>
				<div>
					<label for="reconBalance" class="mb-1 block text-xs text-surface-500">Statement Ending Balance ($)</label>
					<input
						id="reconBalance"
						type="number"
						step="0.01"
						bind:value={newRecon.statementBalance}
						placeholder="0.00"
						class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
					/>
				</div>
			</div>

			<div class="mt-5 flex justify-end gap-2">
				<button
					onclick={() => (showStartModal = false)}
					class="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-800"
				>
					Cancel
				</button>
				<button
					onclick={startReconciliation}
					disabled={starting}
					class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
				>
					{starting ? 'Starting...' : 'Start'}
				</button>
			</div>
		</div>
	</div>
{/if}
