<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	let showAddModal = $state(false);
	let newAccount = $state({
		accountNumber: '',
		name: '',
		accountType: 'asset' as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
		subtype: '',
		description: '',
		parentId: '',
		normalBalance: 'debit' as 'debit' | 'credit'
	});
	let saving = $state(false);

	function formatCents(val: number): string {
		const abs = Math.abs(val);
		return `$${Math.floor(abs / 100).toLocaleString()}.${String(abs % 100).padStart(2, '0')}`;
	}

	const typeLabels: Record<string, string> = {
		asset: 'Assets',
		liability: 'Liabilities',
		equity: 'Equity',
		revenue: 'Revenue',
		expense: 'Expenses'
	};

	const typeOrder = ['asset', 'liability', 'equity', 'revenue', 'expense'];

	const grouped = $derived.by(() => {
		const groups: Record<
			string,
			{
				label: string;
				accounts: (typeof data.accountsWithBalances)[0][];
				subtotal: number;
			}
		> = {};

		for (const type of typeOrder) {
			const typeAccounts = data.accountsWithBalances.filter((a) => a.accountType === type);
			const subtotal = typeAccounts.reduce((sum, a) => sum + a.balance, 0);
			groups[type] = {
				label: typeLabels[type] || type,
				accounts: typeAccounts,
				subtotal
			};
		}

		return groups;
	});

	function defaultNormalBalance(type: string): 'debit' | 'credit' {
		if (type === 'asset' || type === 'expense') return 'debit';
		return 'credit';
	}

	function handleTypeChange() {
		newAccount.normalBalance = defaultNormalBalance(newAccount.accountType);
	}

	async function saveAccount() {
		if (!newAccount.accountNumber || !newAccount.name.trim()) {
			showToast('Account number and name are required', 'error');
			return;
		}

		saving = true;
		try {
			await api('/api/financials/accounts', {
				method: 'POST',
				body: JSON.stringify({
					accountNumber: parseInt(newAccount.accountNumber),
					name: newAccount.name.trim(),
					accountType: newAccount.accountType,
					subtype: newAccount.subtype || null,
					description: newAccount.description || null,
					parentId: newAccount.parentId || null,
					normalBalance: newAccount.normalBalance
				})
			});
			showToast('Account created');
			showAddModal = false;
			newAccount = {
				accountNumber: '',
				name: '',
				accountType: 'asset',
				subtype: '',
				description: '',
				parentId: '',
				normalBalance: 'debit'
			};
			await invalidateAll();
		} catch (err: any) {
			showToast(err.message || 'Failed to create account', 'error');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Chart of Accounts | Financials</title>
</svelte:head>

<div class="p-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-xl font-semibold text-surface-100">Chart of Accounts</h1>
		<button
			onclick={() => (showAddModal = true)}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
		>
			Add Account
		</button>
	</div>

	{#each typeOrder as type}
		{@const group = grouped[type]}
		{#if group.accounts.length > 0}
			<div class="mb-6">
				<div class="mb-2 flex items-center justify-between">
					<h2 class="text-base font-semibold text-surface-100">{group.label}</h2>
					<span class="text-sm font-medium {group.subtotal >= 0 ? 'text-surface-300' : 'text-red-400'}">
						{group.subtotal < 0 ? '-' : ''}{formatCents(group.subtotal)}
					</span>
				</div>
				<div class="overflow-x-auto rounded-lg border border-surface-800">
					<table class="w-full text-left text-sm">
						<thead class="border-b border-surface-800 bg-surface-900">
							<tr>
								<th class="px-4 py-2 font-medium text-surface-300">Account #</th>
								<th class="px-4 py-2 font-medium text-surface-300">Name</th>
								<th class="px-4 py-2 font-medium text-surface-300">Subtype</th>
								<th class="px-4 py-2 text-right font-medium text-surface-300">Balance</th>
							</tr>
						</thead>
						<tbody>
							{#each group.accounts as account (account.id)}
								{@const isChild = !!account.parentId}
								<tr
									class="cursor-pointer border-b border-surface-800 hover:bg-surface-800/50"
									onclick={() => (window.location.href = `/financials/accounts/${account.id}`)}
								>
									<td class="px-4 py-2.5 font-mono text-surface-300 {isChild ? 'pl-10' : ''}">
										{account.accountNumber}
									</td>
									<td class="px-4 py-2.5 font-medium text-surface-100 {isChild ? 'pl-10' : ''}">
										{isChild ? '\u2514 ' : ''}{account.name}
									</td>
									<td class="px-4 py-2.5 text-surface-500">
										{account.subtype ? account.subtype.replace(/_/g, ' ') : '\u2014'}
									</td>
									<td class="px-4 py-2.5 text-right {account.balance >= 0 ? 'text-surface-100' : 'text-red-400'}">
										{account.balance < 0 ? '-' : ''}{formatCents(account.balance)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/each}
</div>

<!-- Add Account Modal -->
{#if showAddModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
		<div class="w-full max-w-md rounded-lg border border-surface-800 bg-surface-900 p-6 shadow-xl">
			<h2 class="mb-4 text-lg font-semibold text-surface-100">Add Account</h2>

			<div class="space-y-3">
				<div>
					<label for="accNum" class="mb-1 block text-xs text-surface-500">Account Number</label>
					<input
						id="accNum"
						type="number"
						bind:value={newAccount.accountNumber}
						class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
						placeholder="e.g. 1000"
					/>
				</div>
				<div>
					<label for="accName" class="mb-1 block text-xs text-surface-500">Name</label>
					<input
						id="accName"
						type="text"
						bind:value={newAccount.name}
						class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
						placeholder="e.g. Operating Checking"
					/>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="accType" class="mb-1 block text-xs text-surface-500">Type</label>
						<select
							id="accType"
							bind:value={newAccount.accountType}
							onchange={handleTypeChange}
							class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
						>
							<option value="asset">Asset</option>
							<option value="liability">Liability</option>
							<option value="equity">Equity</option>
							<option value="revenue">Revenue</option>
							<option value="expense">Expense</option>
						</select>
					</div>
					<div>
						<label for="accNormal" class="mb-1 block text-xs text-surface-500">Normal Balance</label>
						<select
							id="accNormal"
							bind:value={newAccount.normalBalance}
							class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
						>
							<option value="debit">Debit</option>
							<option value="credit">Credit</option>
						</select>
					</div>
				</div>
				<div>
					<label for="accSubtype" class="mb-1 block text-xs text-surface-500">Subtype (optional)</label>
					<input
						id="accSubtype"
						type="text"
						bind:value={newAccount.subtype}
						class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
						placeholder="e.g. current_asset"
					/>
				</div>
				<div>
					<label for="accDesc" class="mb-1 block text-xs text-surface-500">Description (optional)</label>
					<input
						id="accDesc"
						type="text"
						bind:value={newAccount.description}
						class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
					/>
				</div>
				<div>
					<label for="accParent" class="mb-1 block text-xs text-surface-500">Parent Account (optional)</label>
					<select
						id="accParent"
						bind:value={newAccount.parentId}
						class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
					>
						<option value="">None</option>
						{#each data.accounts as account}
							<option value={account.id}>{account.accountNumber} - {account.name}</option>
						{/each}
					</select>
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
					onclick={saveAccount}
					disabled={saving}
					class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Create Account'}
				</button>
			</div>
		</div>
	</div>
{/if}
