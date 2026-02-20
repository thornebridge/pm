<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { formatCurrency } from '$lib/utils/currency.js';
	import ProductForm from '$lib/components/crm/ProductForm.svelte';
	import PriceTierForm from '$lib/components/crm/PriceTierForm.svelte';

	let { data } = $props();

	let showEdit = $state(false);
	let showTierForm = $state(false);
	let editTier = $state<(typeof data.tiers)[0] | undefined>(undefined);

	function typeBadge(type: string) {
		switch (type) {
			case 'product': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
			case 'service': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
			case 'subscription': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
			default: return 'bg-surface-200 text-surface-600';
		}
	}

	function billingModelLabel(model: string) {
		switch (model) {
			case 'one_time': return 'One-Time';
			case 'recurring': return 'Recurring';
			case 'per_unit': return 'Per Unit';
			case 'tiered': return 'Tiered';
			case 'usage': return 'Usage-Based';
			default: return model;
		}
	}

	function intervalLabel(interval: string | null) {
		if (!interval) return '';
		return '/ ' + interval.replace('_', '-');
	}

	async function toggleStatus() {
		const newStatus = data.product.status === 'active' ? 'archived' : 'active';
		try {
			await api(`/api/crm/products/${data.product.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ status: newStatus })
			});
			showToast(`Product ${newStatus}`);
			await invalidateAll();
		} catch {
			showToast('Failed to update status', 'error');
		}
	}

	async function deleteProduct() {
		if (!confirm('Delete this product? It will be archived if used in any opportunities.')) return;
		try {
			await api(`/api/crm/products/${data.product.id}`, { method: 'DELETE' });
			showToast('Product deleted');
			goto('/crm/products');
		} catch {
			showToast('Failed to delete product', 'error');
		}
	}

	async function deleteTier(tierId: string) {
		if (!confirm('Delete this price tier?')) return;
		try {
			await api(`/api/crm/products/${data.product.id}/tiers/${tierId}`, { method: 'DELETE' });
			showToast('Price tier deleted');
			await invalidateAll();
		} catch {
			showToast('Failed to delete tier', 'error');
		}
	}

	function openEditTier(tier: (typeof data.tiers)[0]) {
		editTier = tier;
		showTierForm = true;
	}

	function openAddTier() {
		editTier = undefined;
		showTierForm = true;
	}
</script>

<svelte:head>
	<title>{data.product.name} | Products</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="mb-6 flex items-start justify-between">
		<div>
			<a href="/crm/products" class="text-sm text-surface-500 hover:text-surface-300">&larr; Products</a>
			<div class="mt-1 flex items-center gap-3">
				<h1 class="text-xl font-semibold text-surface-900 dark:text-surface-100">{data.product.name}</h1>
				<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize {typeBadge(data.product.type)}">{data.product.type}</span>
				<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize {data.product.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400'}">{data.product.status}</span>
			</div>
		</div>
		<div class="flex gap-2">
			<button onclick={toggleStatus} class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800">
				{data.product.status === 'active' ? 'Archive' : 'Reactivate'}
			</button>
			<button onclick={() => (showEdit = true)} class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800">
				Edit
			</button>
			<button onclick={deleteProduct} class="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
				Delete
			</button>
		</div>
	</div>

	<!-- Info grid -->
	<div class="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900 md:grid-cols-4">
		<div>
			<p class="text-xs text-surface-500">SKU</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.product.sku || '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Category</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.product.category || '\u2014'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Taxable</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.product.taxable ? 'Yes' : 'No'}</p>
		</div>
		<div>
			<p class="text-xs text-surface-500">Price Tiers</p>
			<p class="text-sm text-surface-900 dark:text-surface-100">{data.tiers.length}</p>
		</div>
	</div>

	{#if data.product.description}
		<div class="mb-6">
			<p class="mb-1 text-xs text-surface-500">Description</p>
			<p class="whitespace-pre-wrap text-sm text-surface-700 dark:text-surface-300">{data.product.description}</p>
		</div>
	{/if}

	<!-- Price Tiers -->
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Price Tiers</h2>
		<button
			onclick={openAddTier}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
		>
			Add Price Tier
		</button>
	</div>

	{#if data.tiers.length === 0}
		<p class="text-sm text-surface-500">No price tiers configured. Add one to enable pricing.</p>
	{:else}
		<div class="space-y-3">
			{#each data.tiers as tier (tier.id)}
				<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
					<div class="flex items-start justify-between">
						<div>
							<div class="flex items-center gap-2">
								<h3 class="text-sm font-medium text-surface-900 dark:text-surface-100">{tier.name}</h3>
								{#if tier.isDefault}
									<span class="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">Default</span>
								{/if}
							</div>
							<div class="mt-1 flex items-center gap-3 text-sm">
								<span class="text-surface-500">{billingModelLabel(tier.billingModel)}</span>
								{#if tier.unitAmount !== null}
									<span class="font-medium text-surface-900 dark:text-surface-100">
										{formatCurrency(tier.unitAmount)} {intervalLabel(tier.billingInterval)}
									</span>
								{/if}
								{#if tier.setupFee}
									<span class="text-surface-500">+ {formatCurrency(tier.setupFee)} setup</span>
								{/if}
								{#if tier.trialDays}
									<span class="text-surface-500">{tier.trialDays}-day trial</span>
								{/if}
								{#if tier.unitLabel}
									<span class="text-surface-500">per {tier.unitLabel}</span>
								{/if}
							</div>
						</div>
						<div class="flex gap-2">
							<button
								onclick={() => openEditTier(tier)}
								class="text-xs text-surface-500 hover:text-surface-900 dark:hover:text-surface-100"
							>
								Edit
							</button>
							<button
								onclick={() => deleteTier(tier.id)}
								class="text-xs text-red-500 hover:text-red-700"
							>
								Delete
							</button>
						</div>
					</div>

					{#if tier.brackets && tier.brackets.length > 0}
						<div class="mt-3 overflow-x-auto rounded border border-surface-200 dark:border-surface-700">
							<table class="w-full text-left text-xs">
								<thead class="bg-surface-100 dark:bg-surface-800">
									<tr>
										<th class="px-3 py-1.5 text-surface-600 dark:text-surface-400">From</th>
										<th class="px-3 py-1.5 text-surface-600 dark:text-surface-400">To</th>
										<th class="px-3 py-1.5 text-surface-600 dark:text-surface-400">Per Unit</th>
										<th class="px-3 py-1.5 text-surface-600 dark:text-surface-400">Flat Fee</th>
									</tr>
								</thead>
								<tbody>
									{#each tier.brackets as bracket (bracket.id)}
										<tr class="border-t border-surface-200 dark:border-surface-700">
											<td class="px-3 py-1.5 text-surface-900 dark:text-surface-100">{bracket.minUnits}</td>
											<td class="px-3 py-1.5 text-surface-900 dark:text-surface-100">{bracket.maxUnits ?? 'Unlimited'}</td>
											<td class="px-3 py-1.5 text-surface-900 dark:text-surface-100">{formatCurrency(bracket.unitAmount)}</td>
											<td class="px-3 py-1.5 text-surface-900 dark:text-surface-100">{bracket.flatAmount ? formatCurrency(bracket.flatAmount) : '\u2014'}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<ProductForm
	open={showEdit}
	onclose={() => (showEdit = false)}
	product={data.product}
/>

<PriceTierForm
	open={showTierForm}
	onclose={() => (showTierForm = false)}
	productId={data.product.id}
	tier={editTier}
/>
