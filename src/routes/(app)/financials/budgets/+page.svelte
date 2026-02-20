<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	function fmt(cents: number) {
		const neg = cents < 0;
		const a = Math.abs(cents);
		return (neg ? '-' : '') + '$' + Math.floor(a / 100).toLocaleString() + '.' + String(a % 100).padStart(2, '0');
	}

	function formatPeriod(start: number, end: number, type: string): string {
		const s = new Date(start);
		if (type === 'yearly') {
			return s.getFullYear().toString();
		}
		if (type === 'quarterly') {
			const q = Math.floor(s.getMonth() / 3) + 1;
			return `Q${q} ${s.getFullYear()}`;
		}
		return s.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
	}

	function progressColor(pct: number): string {
		if (pct > 100) return 'bg-red-500';
		if (pct > 80) return 'bg-yellow-500';
		return 'bg-green-500';
	}

	function varianceColor(variance: number): string {
		if (variance < 0) return 'text-red-400';
		if (variance > 0) return 'text-green-400';
		return 'text-surface-300';
	}

	// Group budgets by period
	const grouped = $derived.by(() => {
		const groups: Record<string, { label: string; items: typeof data.budgets }> = {};
		for (const b of data.budgets) {
			const key = formatPeriod(b.periodStart, b.periodEnd, b.periodType);
			if (!groups[key]) {
				groups[key] = { label: key, items: [] };
			}
			groups[key].items.push(b);
		}
		return Object.values(groups);
	});

	// Add budget modal
	let showAddModal = $state(false);
	let newBudget = $state({
		accountId: '',
		periodType: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
		periodDate: new Date().toISOString().slice(0, 7), // YYYY-MM
		amount: ''
	});
	let saving = $state(false);

	function computePeriodDates(type: string, dateStr: string): { start: number; end: number } {
		const [year, month] = dateStr.split('-').map(Number);
		if (type === 'monthly') {
			const start = new Date(year, month - 1, 1).getTime();
			const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();
			return { start, end };
		}
		if (type === 'quarterly') {
			const q = Math.floor((month - 1) / 3);
			const start = new Date(year, q * 3, 1).getTime();
			const end = new Date(year, q * 3 + 3, 0, 23, 59, 59, 999).getTime();
			return { start, end };
		}
		// yearly
		const start = new Date(year, 0, 1).getTime();
		const end = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
		return { start, end };
	}

	async function saveBudget() {
		if (!newBudget.accountId) {
			showToast('Select an account', 'error');
			return;
		}
		const amountNum = parseFloat(newBudget.amount);
		if (isNaN(amountNum) || amountNum <= 0) {
			showToast('Enter a valid amount', 'error');
			return;
		}

		saving = true;
		try {
			const { start, end } = computePeriodDates(newBudget.periodType, newBudget.periodDate);
			await api('/api/financials/budgets', {
				method: 'POST',
				body: JSON.stringify({
					accountId: newBudget.accountId,
					periodType: newBudget.periodType,
					periodStart: start,
					periodEnd: end,
					amount: Math.round(amountNum * 100)
				})
			});

			showToast('Budget created');
			showAddModal = false;
			newBudget = {
				accountId: '',
				periodType: 'monthly',
				periodDate: new Date().toISOString().slice(0, 7),
				amount: ''
			};
			await invalidateAll();
		} catch (err: any) {
			showToast(err.message || 'Failed to create budget', 'error');
		} finally {
			saving = false;
		}
	}

	// Combine expense and revenue accounts for selector
	const budgetableAccounts = $derived([...data.expenseAccounts, ...data.revenueAccounts]);
</script>

<svelte:head>
	<title>Budgets | Financials</title>
</svelte:head>

<div class="p-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-xl font-semibold text-surface-100">Budgets</h1>
		<button
			onclick={() => (showAddModal = true)}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
		>
			Add Budget
		</button>
	</div>

	{#if data.budgets.length === 0}
		<p class="text-sm text-surface-500">No budgets yet. Create one to start tracking spending against targets.</p>
	{:else}
		{#each grouped as group}
			<div class="mb-6">
				<h2 class="mb-2 text-base font-semibold text-surface-100">{group.label}</h2>
				<div class="overflow-x-auto rounded-lg border border-surface-800">
					<table class="w-full text-left text-sm">
						<thead class="border-b border-surface-800 bg-surface-900">
							<tr>
								<th class="px-4 py-2 font-medium text-surface-300">Account</th>
								<th class="px-4 py-2 text-right font-medium text-surface-300">Budgeted</th>
								<th class="px-4 py-2 text-right font-medium text-surface-300">Actual</th>
								<th class="px-4 py-2 text-right font-medium text-surface-300">Variance</th>
								<th class="w-40 px-4 py-2 font-medium text-surface-300">Progress</th>
							</tr>
						</thead>
						<tbody>
							{#each group.items as budget (budget.id)}
								{@const pctClamped = Math.min(Math.max(budget.percentUsed, 0), 100)}
								<tr class="border-b border-surface-800">
									<td class="px-4 py-2.5 text-surface-100">
										<span class="font-mono text-surface-500">{budget.accountNumber}</span>
										{budget.accountName}
									</td>
									<td class="px-4 py-2.5 text-right text-surface-100">{fmt(budget.amount)}</td>
									<td class="px-4 py-2.5 text-right text-surface-100">{fmt(budget.actual)}</td>
									<td class="px-4 py-2.5 text-right {varianceColor(budget.variance)}">{fmt(budget.variance)}</td>
									<td class="px-4 py-2.5">
										<div class="flex items-center gap-2">
											<div class="h-2 flex-1 rounded-full bg-surface-700">
												<div
													class="h-2 rounded-full transition-all {progressColor(budget.percentUsed)}"
													style="width: {pctClamped}%"
												></div>
											</div>
											<span class="w-12 text-right text-xs text-surface-400">
												{budget.percentUsed.toFixed(0)}%
											</span>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/each}
	{/if}
</div>

<!-- Add Budget Modal -->
{#if showAddModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
		<div class="w-full max-w-md rounded-lg border border-surface-800 bg-surface-900 p-6 shadow-xl">
			<h2 class="mb-4 text-lg font-semibold text-surface-100">Add Budget</h2>

			<div class="space-y-3">
				<div>
					<label for="budgetAccount" class="mb-1 block text-xs text-surface-500">Account</label>
					<select
						id="budgetAccount"
						bind:value={newBudget.accountId}
						class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
					>
						<option value="">Select account...</option>
						{#each budgetableAccounts as account}
							<option value={account.id}>{account.accountNumber} - {account.name}</option>
						{/each}
					</select>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="budgetPeriodType" class="mb-1 block text-xs text-surface-500">Period Type</label>
						<select
							id="budgetPeriodType"
							bind:value={newBudget.periodType}
							class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
						>
							<option value="monthly">Monthly</option>
							<option value="quarterly">Quarterly</option>
							<option value="yearly">Yearly</option>
						</select>
					</div>
					<div>
						<label for="budgetPeriodDate" class="mb-1 block text-xs text-surface-500">Period (month)</label>
						<input
							id="budgetPeriodDate"
							type="month"
							bind:value={newBudget.periodDate}
							class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
						/>
					</div>
				</div>
				<div>
					<label for="budgetAmount" class="mb-1 block text-xs text-surface-500">Amount ($)</label>
					<input
						id="budgetAmount"
						type="number"
						step="0.01"
						min="0"
						bind:value={newBudget.amount}
						placeholder="0.00"
						class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
					/>
				</div>
			</div>

			<div class="mt-5 flex justify-end gap-2">
				<button
					onclick={() => (showAddModal = false)}
					class="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-800"
				>
					Cancel
				</button>
				<button
					onclick={saveBudget}
					disabled={saving}
					class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Create Budget'}
				</button>
			</div>
		</div>
	</div>
{/if}
