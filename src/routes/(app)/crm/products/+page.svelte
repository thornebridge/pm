<script lang="ts">
	import { formatCurrency } from '$lib/utils/currency.js';
	import ProductForm from '$lib/components/crm/ProductForm.svelte';

	let { data } = $props();

	let showForm = $state(false);
	let search = $state('');
	let statusFilter = $state<'all' | 'active' | 'archived'>('active');
	let typeFilter = $state<'all' | 'product' | 'service' | 'subscription'>('all');

	const filtered = $derived.by(() => {
		let list = data.products;
		if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter);
		if (typeFilter !== 'all') list = list.filter((p) => p.type === typeFilter);
		if (search) {
			const q = search.toLowerCase();
			list = list.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.sku?.toLowerCase().includes(q) ||
					p.category?.toLowerCase().includes(q)
			);
		}
		return list;
	});

	function typeBadge(type: string) {
		switch (type) {
			case 'product': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
			case 'service': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
			case 'subscription': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
			default: return 'bg-surface-200 text-surface-600';
		}
	}
</script>

<svelte:head>
	<title>Products | CRM</title>
</svelte:head>

<div class="p-6">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-xl font-semibold text-surface-900 dark:text-surface-100">Products</h1>
		<button
			onclick={() => (showForm = true)}
			class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
		>
			Add Product
		</button>
	</div>

	<div class="mb-4 flex flex-wrap gap-3">
		<input
			bind:value={search}
			placeholder="Search products..."
			class="w-64 rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		/>
		<select
			bind:value={statusFilter}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		>
			<option value="all">All Status</option>
			<option value="active">Active</option>
			<option value="archived">Archived</option>
		</select>
		<select
			bind:value={typeFilter}
			class="rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		>
			<option value="all">All Types</option>
			<option value="product">Product</option>
			<option value="service">Service</option>
			<option value="subscription">Subscription</option>
		</select>
	</div>

	{#if filtered.length === 0}
		<p class="text-sm text-surface-500">No products found.</p>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-300 dark:border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-300 bg-surface-100 dark:border-surface-800 dark:bg-surface-900">
					<tr>
						<th class="px-4 py-2 font-medium text-surface-700 dark:text-surface-300">Name</th>
						<th class="px-4 py-2 font-medium text-surface-700 dark:text-surface-300">SKU</th>
						<th class="px-4 py-2 font-medium text-surface-700 dark:text-surface-300">Type</th>
						<th class="px-4 py-2 font-medium text-surface-700 dark:text-surface-300">Category</th>
						<th class="px-4 py-2 font-medium text-surface-700 dark:text-surface-300">Default Price</th>
						<th class="px-4 py-2 font-medium text-surface-700 dark:text-surface-300">Tiers</th>
						<th class="px-4 py-2 font-medium text-surface-700 dark:text-surface-300">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as product (product.id)}
						<tr
							class="cursor-pointer border-b border-surface-200 hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800/50"
							onclick={() => (window.location.href = `/crm/products/${product.id}`)}
						>
							<td class="px-4 py-2.5 font-medium text-surface-900 dark:text-surface-100">{product.name}</td>
							<td class="px-4 py-2.5 text-surface-500">{product.sku || '\u2014'}</td>
							<td class="px-4 py-2.5">
								<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize {typeBadge(product.type)}">{product.type}</span>
							</td>
							<td class="px-4 py-2.5 text-surface-500">{product.category || '\u2014'}</td>
							<td class="px-4 py-2.5 text-surface-900 dark:text-surface-100">
								{product.defaultPrice !== null ? formatCurrency(product.defaultPrice) : '\u2014'}
							</td>
							<td class="px-4 py-2.5 text-surface-500">{product.tierCount}</td>
							<td class="px-4 py-2.5">
								<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize {product.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400'}">{product.status}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<ProductForm
	open={showForm}
	onclose={() => (showForm = false)}
/>
