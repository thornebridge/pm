<script lang="ts">
	import { browser } from '$app/environment';
	import { showToast } from '$lib/stores/toasts.js';

	const STORAGE_KEY = 'financials_settings';

	interface FinancialsSettings {
		fiscalYearStartMonth: number;
		defaultCurrency: string;
	}

	function loadSettings(): FinancialsSettings {
		if (!browser) {
			return { fiscalYearStartMonth: 1, defaultCurrency: 'USD' };
		}
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) return JSON.parse(raw);
		} catch {
			// ignore parse errors
		}
		return { fiscalYearStartMonth: 1, defaultCurrency: 'USD' };
	}

	const initial = loadSettings();
	let fiscalYearStartMonth = $state(initial.fiscalYearStartMonth);
	let defaultCurrency = $state(initial.defaultCurrency);
	let saved = $state(false);

	const months = [
		{ value: 1, label: 'January' },
		{ value: 2, label: 'February' },
		{ value: 3, label: 'March' },
		{ value: 4, label: 'April' },
		{ value: 5, label: 'May' },
		{ value: 6, label: 'June' },
		{ value: 7, label: 'July' },
		{ value: 8, label: 'August' },
		{ value: 9, label: 'September' },
		{ value: 10, label: 'October' },
		{ value: 11, label: 'November' },
		{ value: 12, label: 'December' }
	];

	const currencies = [
		{ value: 'USD', label: 'US Dollar (USD)' },
		{ value: 'EUR', label: 'Euro (EUR)' },
		{ value: 'GBP', label: 'British Pound (GBP)' },
		{ value: 'CAD', label: 'Canadian Dollar (CAD)' },
		{ value: 'AUD', label: 'Australian Dollar (AUD)' },
		{ value: 'JPY', label: 'Japanese Yen (JPY)' },
		{ value: 'CHF', label: 'Swiss Franc (CHF)' },
		{ value: 'CNY', label: 'Chinese Yuan (CNY)' },
		{ value: 'INR', label: 'Indian Rupee (INR)' },
		{ value: 'MXN', label: 'Mexican Peso (MXN)' }
	];

	function saveSettings() {
		if (!browser) return;

		const settings: FinancialsSettings = {
			fiscalYearStartMonth,
			defaultCurrency
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
		saved = true;
		showToast('Settings saved');
		setTimeout(() => {
			saved = false;
		}, 2000);
	}
</script>

<svelte:head>
	<title>Settings | Financials</title>
</svelte:head>

<div class="p-6">
	<h1 class="mb-6 text-xl font-semibold text-surface-100">Financial Settings</h1>

	<div class="max-w-lg space-y-6">
		<!-- Fiscal Year Start -->
		<div class="rounded-lg border border-surface-800 bg-surface-900 p-4">
			<h2 class="mb-3 text-base font-semibold text-surface-100">Fiscal Year</h2>
			<div>
				<label for="fyMonth" class="mb-1 block text-xs text-surface-500">Fiscal Year Start Month</label>
				<select
					id="fyMonth"
					bind:value={fiscalYearStartMonth}
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
				>
					{#each months as month}
						<option value={month.value}>{month.label}</option>
					{/each}
				</select>
				<p class="mt-1 text-xs text-surface-500">
					The month your fiscal year begins. Most businesses use January.
				</p>
			</div>
		</div>

		<!-- Default Currency -->
		<div class="rounded-lg border border-surface-800 bg-surface-900 p-4">
			<h2 class="mb-3 text-base font-semibold text-surface-100">Currency</h2>
			<div>
				<label for="defCurrency" class="mb-1 block text-xs text-surface-500">Default Currency</label>
				<select
					id="defCurrency"
					bind:value={defaultCurrency}
					class="w-full rounded-md border border-surface-700 bg-surface-800 px-2 py-1.5 text-sm text-surface-100"
				>
					{#each currencies as currency}
						<option value={currency.value}>{currency.label}</option>
					{/each}
				</select>
				<p class="mt-1 text-xs text-surface-500">
					Used as the default currency for new accounts and transactions.
				</p>
			</div>
		</div>

		<!-- Save Button -->
		<div>
			<button
				onclick={saveSettings}
				class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
			>
				{saved ? 'Saved' : 'Save Settings'}
			</button>
		</div>
	</div>
</div>
