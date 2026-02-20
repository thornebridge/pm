<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';

	interface PriceTier {
		id: string;
		productId: string;
		name: string;
		billingModel: string;
		unitAmount: number | null;
		currency: string;
		billingInterval: string | null;
		setupFee: number | null;
		trialDays: number | null;
		unitLabel: string | null;
		minQuantity: number | null;
		maxQuantity: number | null;
		isDefault: boolean;
	}

	interface Props {
		open: boolean;
		onclose: () => void;
		productId: string;
		tier?: PriceTier;
	}

	let { open, onclose, productId, tier }: Props = $props();

	let name = $state('');
	let billingModel = $state('one_time');
	let unitAmountStr = $state('');
	let currency = $state('USD');
	let billingInterval = $state('');
	let setupFeeStr = $state('');
	let trialDaysStr = $state('');
	let unitLabel = $state('');
	let minQuantityStr = $state('');
	let maxQuantityStr = $state('');
	let isDefault = $state(false);
	let saving = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	const isEdit = $derived(!!tier);
	const showInterval = $derived(billingModel === 'recurring' || billingModel === 'usage');
	const showUnitLabel = $derived(billingModel === 'per_unit' || billingModel === 'tiered' || billingModel === 'usage');

	$effect(() => {
		if (open) {
			if (tier) {
				name = tier.name;
				billingModel = tier.billingModel;
				unitAmountStr = tier.unitAmount !== null ? (tier.unitAmount / 100).toString() : '';
				currency = tier.currency;
				billingInterval = tier.billingInterval || '';
				setupFeeStr = tier.setupFee !== null ? (tier.setupFee / 100).toString() : '';
				trialDaysStr = tier.trialDays !== null ? tier.trialDays.toString() : '';
				unitLabel = tier.unitLabel || '';
				minQuantityStr = tier.minQuantity !== null ? tier.minQuantity.toString() : '';
				maxQuantityStr = tier.maxQuantity !== null ? tier.maxQuantity.toString() : '';
				isDefault = tier.isDefault;
			} else {
				name = '';
				billingModel = 'one_time';
				unitAmountStr = '';
				currency = 'USD';
				billingInterval = '';
				setupFeeStr = '';
				trialDaysStr = '';
				unitLabel = '';
				minQuantityStr = '';
				maxQuantityStr = '';
				isDefault = false;
			}
			saving = false;
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	async function save() {
		if (!name.trim()) return;
		saving = true;
		try {
			const payload = {
				name: name.trim(),
				billingModel,
				unitAmount: unitAmountStr ? Math.round(parseFloat(unitAmountStr) * 100) : null,
				currency,
				billingInterval: showInterval && billingInterval ? billingInterval : null,
				setupFee: setupFeeStr ? Math.round(parseFloat(setupFeeStr) * 100) : null,
				trialDays: trialDaysStr ? parseInt(trialDaysStr) : null,
				unitLabel: showUnitLabel && unitLabel ? unitLabel : null,
				minQuantity: minQuantityStr ? parseInt(minQuantityStr) : null,
				maxQuantity: maxQuantityStr ? parseInt(maxQuantityStr) : null,
				isDefault
			};

			if (isEdit) {
				await api(`/api/crm/products/${productId}/tiers/${tier!.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				showToast('Price tier updated');
			} else {
				await api(`/api/crm/products/${productId}/tiers`, {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				showToast('Price tier created');
			}
			onclose();
			await invalidateAll();
		} catch {
			showToast('Failed to save price tier', 'error');
		} finally {
			saving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			save();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 pt-[10vh] pb-10 dark:bg-black/60"
		onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
		onkeydown={handleKeydown}
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-lg rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
			transition:fly={{ y: -10, duration: 200 }}
		>
			<div class="border-b border-surface-300 px-4 py-3 dark:border-surface-800">
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
					{isEdit ? 'Edit Price Tier' : 'Add Price Tier'}
				</h2>
			</div>
			<form onsubmit={(e) => { e.preventDefault(); save(); }} class="space-y-3 p-4">
				<div>
					<label for="tier-name" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Name *</label>
					<input id="tier-name" bind:this={inputEl} bind:value={name} placeholder='e.g. "Monthly", "Enterprise Annual"' class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="tier-model" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Billing Model</label>
						<select id="tier-model" bind:value={billingModel} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="one_time">One-Time</option>
							<option value="recurring">Recurring</option>
							<option value="per_unit">Per Unit</option>
							<option value="tiered">Tiered</option>
							<option value="usage">Usage-Based</option>
						</select>
					</div>
					<div>
						<label for="tier-amount" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Unit Price ($)</label>
						<input id="tier-amount" bind:value={unitAmountStr} type="number" step="0.01" placeholder="0.00" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				{#if showInterval}
					<div>
						<label for="tier-interval" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Billing Interval</label>
						<select id="tier-interval" bind:value={billingInterval} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="">Select interval</option>
							<option value="weekly">Weekly</option>
							<option value="monthly">Monthly</option>
							<option value="quarterly">Quarterly</option>
							<option value="semi_annual">Semi-Annual</option>
							<option value="annual">Annual</option>
						</select>
					</div>
				{/if}
				{#if showUnitLabel}
					<div>
						<label for="tier-unit" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Unit Label</label>
						<input id="tier-unit" bind:value={unitLabel} placeholder='e.g. "seat", "user", "GB", "hour"' class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				{/if}
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="tier-setup" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Setup Fee ($)</label>
						<input id="tier-setup" bind:value={setupFeeStr} type="number" step="0.01" placeholder="0.00" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="tier-trial" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Trial Days</label>
						<input id="tier-trial" bind:value={trialDaysStr} type="number" placeholder="0" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="tier-min" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Min Quantity</label>
						<input id="tier-min" bind:value={minQuantityStr} type="number" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="tier-max" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Max Quantity</label>
						<input id="tier-max" bind:value={maxQuantityStr} type="number" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={isDefault} class="rounded border-surface-300 dark:border-surface-600" />
					<span class="text-sm text-surface-700 dark:text-surface-300">Default tier</span>
				</label>
				<div class="flex items-center justify-between pt-1">
					<span class="text-[10px] text-surface-400">Ctrl+Enter to save</span>
					<div class="flex gap-2">
						<button type="button" onclick={onclose} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</button>
						<button type="submit" disabled={saving || !name.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
							{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
