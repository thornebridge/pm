<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	type Tab = 'deposit' | 'expense' | 'transfer';
	let activeTab = $state<Tab>('deposit');

	// Deposit form
	let depositBankAccountId = $state('');
	let depositIncomeAccountId = $state('');
	let depositAmount = $state('');
	let depositDate = $state(new Date().toISOString().split('T')[0]);
	let depositDescription = $state('');

	// Expense form
	let expenseBankAccountId = $state('');
	let expenseAccountId = $state('');
	let expenseAmount = $state('');
	let expenseDate = $state(new Date().toISOString().split('T')[0]);
	let expenseDescription = $state('');

	// Transfer form
	let transferFromAccountId = $state('');
	let transferToAccountId = $state('');
	let transferAmount = $state('');
	let transferDate = $state(new Date().toISOString().split('T')[0]);
	let transferDescription = $state('');

	let saving = $state(false);

	function tabClass(tab: Tab): string {
		if (tab === activeTab) {
			return 'border-b-2 border-brand-600 text-surface-100 font-medium';
		}
		return 'text-surface-500 hover:text-surface-300';
	}

	function resetDepositForm() {
		depositBankAccountId = '';
		depositIncomeAccountId = '';
		depositAmount = '';
		depositDate = new Date().toISOString().split('T')[0];
		depositDescription = '';
	}

	function resetExpenseForm() {
		expenseBankAccountId = '';
		expenseAccountId = '';
		expenseAmount = '';
		expenseDate = new Date().toISOString().split('T')[0];
		expenseDescription = '';
	}

	function resetTransferForm() {
		transferFromAccountId = '';
		transferToAccountId = '';
		transferAmount = '';
		transferDate = new Date().toISOString().split('T')[0];
		transferDescription = '';
	}

	async function submitDeposit() {
		if (!depositBankAccountId || !depositIncomeAccountId || !depositAmount || !depositDate || !depositDescription.trim()) {
			showToast('All fields are required', 'error');
			return;
		}

		const amountCents = Math.round(parseFloat(depositAmount) * 100);
		if (isNaN(amountCents) || amountCents <= 0) {
			showToast('Amount must be a positive number', 'error');
			return;
		}

		saving = true;
		try {
			await api('/api/financials/transactions/deposit', {
				method: 'POST',
				body: JSON.stringify({
					bankAccountId: depositBankAccountId,
					incomeAccountId: depositIncomeAccountId,
					amount: amountCents,
					date: new Date(depositDate).getTime(),
					description: depositDescription.trim()
				})
			});
			showToast('Deposit recorded');
			resetDepositForm();
		} catch (err: any) {
			showToast(err.message || 'Failed to record deposit', 'error');
		} finally {
			saving = false;
		}
	}

	async function submitExpense() {
		if (!expenseBankAccountId || !expenseAccountId || !expenseAmount || !expenseDate || !expenseDescription.trim()) {
			showToast('All fields are required', 'error');
			return;
		}

		const amountCents = Math.round(parseFloat(expenseAmount) * 100);
		if (isNaN(amountCents) || amountCents <= 0) {
			showToast('Amount must be a positive number', 'error');
			return;
		}

		saving = true;
		try {
			await api('/api/financials/transactions/expense', {
				method: 'POST',
				body: JSON.stringify({
					bankAccountId: expenseBankAccountId,
					expenseAccountId: expenseAccountId,
					amount: amountCents,
					date: new Date(expenseDate).getTime(),
					description: expenseDescription.trim()
				})
			});
			showToast('Expense recorded');
			resetExpenseForm();
		} catch (err: any) {
			showToast(err.message || 'Failed to record expense', 'error');
		} finally {
			saving = false;
		}
	}

	async function submitTransfer() {
		if (!transferFromAccountId || !transferToAccountId || !transferAmount || !transferDate || !transferDescription.trim()) {
			showToast('All fields are required', 'error');
			return;
		}

		if (transferFromAccountId === transferToAccountId) {
			showToast('Cannot transfer to the same account', 'error');
			return;
		}

		const amountCents = Math.round(parseFloat(transferAmount) * 100);
		if (isNaN(amountCents) || amountCents <= 0) {
			showToast('Amount must be a positive number', 'error');
			return;
		}

		saving = true;
		try {
			await api('/api/financials/transactions/transfer', {
				method: 'POST',
				body: JSON.stringify({
					fromAccountId: transferFromAccountId,
					toAccountId: transferToAccountId,
					amount: amountCents,
					date: new Date(transferDate).getTime(),
					description: transferDescription.trim()
				})
			});
			showToast('Transfer recorded');
			resetTransferForm();
		} catch (err: any) {
			showToast(err.message || 'Failed to record transfer', 'error');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Transactions | Financials</title>
</svelte:head>

<div class="p-6">
	<h1 class="mb-6 text-xl font-semibold text-surface-100">Quick Transactions</h1>

	<!-- Tabs -->
	<div class="mb-6 flex gap-6 border-b border-surface-800">
		<button
			onclick={() => (activeTab = 'deposit')}
			class="pb-2 text-sm {tabClass('deposit')}"
		>
			Deposit
		</button>
		<button
			onclick={() => (activeTab = 'expense')}
			class="pb-2 text-sm {tabClass('expense')}"
		>
			Expense
		</button>
		<button
			onclick={() => (activeTab = 'transfer')}
			class="pb-2 text-sm {tabClass('transfer')}"
		>
			Transfer
		</button>
	</div>

	<!-- Deposit Tab -->
	{#if activeTab === 'deposit'}
		<div class="max-w-lg space-y-4">
			<div>
				<label for="depBank" class="mb-1 block text-xs text-surface-500">Bank Account</label>
				<select
					id="depBank"
					bind:value={depositBankAccountId}
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100"
				>
					<option value="">Select bank account...</option>
					{#each data.bankAccounts as account}
						<option value={account.id}>{account.accountNumber} - {account.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="depIncome" class="mb-1 block text-xs text-surface-500">Income Account</label>
				<select
					id="depIncome"
					bind:value={depositIncomeAccountId}
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100"
				>
					<option value="">Select income account...</option>
					{#each data.revenueAccounts as account}
						<option value={account.id}>{account.accountNumber} - {account.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="depAmount" class="mb-1 block text-xs text-surface-500">Amount ($)</label>
				<input
					id="depAmount"
					type="number"
					step="0.01"
					min="0.01"
					bind:value={depositAmount}
					placeholder="0.00"
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
				/>
			</div>
			<div>
				<label for="depDate" class="mb-1 block text-xs text-surface-500">Date</label>
				<input
					id="depDate"
					type="date"
					bind:value={depositDate}
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
				/>
			</div>
			<div>
				<label for="depDesc" class="mb-1 block text-xs text-surface-500">Description</label>
				<input
					id="depDesc"
					type="text"
					bind:value={depositDescription}
					placeholder="e.g. Client payment"
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none placeholder:text-surface-500 focus:border-brand-500"
				/>
			</div>
			<button
				onclick={submitDeposit}
				disabled={saving}
				class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
			>
				{saving ? 'Recording...' : 'Record Deposit'}
			</button>
		</div>
	{/if}

	<!-- Expense Tab -->
	{#if activeTab === 'expense'}
		<div class="max-w-lg space-y-4">
			<div>
				<label for="expBank" class="mb-1 block text-xs text-surface-500">Bank Account</label>
				<select
					id="expBank"
					bind:value={expenseBankAccountId}
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100"
				>
					<option value="">Select bank account...</option>
					{#each data.bankAccounts as account}
						<option value={account.id}>{account.accountNumber} - {account.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="expAccount" class="mb-1 block text-xs text-surface-500">Expense Account</label>
				<select
					id="expAccount"
					bind:value={expenseAccountId}
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100"
				>
					<option value="">Select expense account...</option>
					{#each data.expenseAccounts as account}
						<option value={account.id}>{account.accountNumber} - {account.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="expAmount" class="mb-1 block text-xs text-surface-500">Amount ($)</label>
				<input
					id="expAmount"
					type="number"
					step="0.01"
					min="0.01"
					bind:value={expenseAmount}
					placeholder="0.00"
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
				/>
			</div>
			<div>
				<label for="expDate" class="mb-1 block text-xs text-surface-500">Date</label>
				<input
					id="expDate"
					type="date"
					bind:value={expenseDate}
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
				/>
			</div>
			<div>
				<label for="expDesc" class="mb-1 block text-xs text-surface-500">Description</label>
				<input
					id="expDesc"
					type="text"
					bind:value={expenseDescription}
					placeholder="e.g. Office supplies"
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none placeholder:text-surface-500 focus:border-brand-500"
				/>
			</div>
			<button
				onclick={submitExpense}
				disabled={saving}
				class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
			>
				{saving ? 'Recording...' : 'Record Expense'}
			</button>
		</div>
	{/if}

	<!-- Transfer Tab -->
	{#if activeTab === 'transfer'}
		<div class="max-w-lg space-y-4">
			<div>
				<label for="xfrFrom" class="mb-1 block text-xs text-surface-500">From Account</label>
				<select
					id="xfrFrom"
					bind:value={transferFromAccountId}
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100"
				>
					<option value="">Select account...</option>
					{#each data.bankAccounts as account}
						<option value={account.id}>{account.accountNumber} - {account.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="xfrTo" class="mb-1 block text-xs text-surface-500">To Account</label>
				<select
					id="xfrTo"
					bind:value={transferToAccountId}
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100"
				>
					<option value="">Select account...</option>
					{#each data.bankAccounts as account}
						<option value={account.id}>{account.accountNumber} - {account.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="xfrAmount" class="mb-1 block text-xs text-surface-500">Amount ($)</label>
				<input
					id="xfrAmount"
					type="number"
					step="0.01"
					min="0.01"
					bind:value={transferAmount}
					placeholder="0.00"
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
				/>
			</div>
			<div>
				<label for="xfrDate" class="mb-1 block text-xs text-surface-500">Date</label>
				<input
					id="xfrDate"
					type="date"
					bind:value={transferDate}
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none focus:border-brand-500"
				/>
			</div>
			<div>
				<label for="xfrDesc" class="mb-1 block text-xs text-surface-500">Description</label>
				<input
					id="xfrDesc"
					type="text"
					bind:value={transferDescription}
					placeholder="e.g. Transfer to savings"
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 outline-none placeholder:text-surface-500 focus:border-brand-500"
				/>
			</div>
			<button
				onclick={submitTransfer}
				disabled={saving}
				class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
			>
				{saving ? 'Recording...' : 'Record Transfer'}
			</button>
		</div>
	{/if}
</div>
