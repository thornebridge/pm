<script lang="ts">
	interface Product {
		id: string;
		name: string;
		sku: string | null;
		tiers?: Array<{
			id: string;
			name: string;
			unitAmount: number | null;
			billingModel: string;
			billingInterval: string | null;
			setupFee: number | null;
			unitLabel: string | null;
			isDefault: boolean;
		}>;
	}

	interface Props {
		products: Product[];
		onselect: (productId: string, priceTierId: string | null) => void;
	}

	let { products, onselect }: Props = $props();

	let selectedProductId = $state('');
	let selectedTierId = $state('');
	let loadingTiers = $state(false);
	let tiers = $state<Product['tiers']>([]);

	const selectedProduct = $derived(products.find((p) => p.id === selectedProductId));

	$effect(() => {
		if (selectedProductId) {
			loadTiers(selectedProductId);
		} else {
			tiers = [];
			selectedTierId = '';
		}
	});

	async function loadTiers(productId: string) {
		loadingTiers = true;
		try {
			const res = await fetch(`/api/crm/products/${productId}`);
			const data = await res.json();
			tiers = data.tiers || [];
			// Auto-select default tier
			const def = tiers?.find((t) => t.isDefault);
			selectedTierId = def?.id || tiers?.[0]?.id || '';
		} catch {
			tiers = [];
		} finally {
			loadingTiers = false;
		}
	}

	function handleAdd() {
		if (!selectedProductId) return;
		onselect(selectedProductId, selectedTierId || null);
		selectedProductId = '';
		selectedTierId = '';
		tiers = [];
	}
</script>

<div class="flex flex-wrap items-end gap-2">
	<div class="min-w-[180px]">
		<label for="pick-product" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Product</label>
		<select
			id="pick-product"
			bind:value={selectedProductId}
			class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
		>
			<option value="">Select product...</option>
			{#each products as p (p.id)}
				<option value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>
			{/each}
		</select>
	</div>

	{#if tiers && tiers.length > 0}
		<div class="min-w-[160px]">
			<label for="pick-tier" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Price Tier</label>
			<select
				id="pick-tier"
				bind:value={selectedTierId}
				class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
			>
				{#each tiers as t (t.id)}
					<option value={t.id}>{t.name}{t.unitAmount !== null ? ` ($${(t.unitAmount / 100).toFixed(2)})` : ''}</option>
				{/each}
			</select>
		</div>
	{/if}

	<button
		onclick={handleAdd}
		disabled={!selectedProductId || loadingTiers}
		class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
	>
		{loadingTiers ? 'Loading...' : 'Add'}
	</button>
</div>
