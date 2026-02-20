<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { formatCurrency } from '$lib/utils/currency.js';
	import ProductPicker from './ProductPicker.svelte';

	interface OpportunityItem {
		id: string;
		opportunityId: string;
		productId: string;
		productName: string;
		productSku: string | null;
		description: string | null;
		quantity: number;
		unitAmount: number;
		discountPercent: number | null;
		discountAmount: number | null;
		setupFee: number | null;
		billingModel: string | null;
		billingInterval: string | null;
		position: number;
	}

	interface Props {
		opportunityId: string;
		items: OpportunityItem[];
		products: Array<{ id: string; name: string; sku: string | null }>;
	}

	let { opportunityId, items, products }: Props = $props();

	function lineTotal(item: OpportunityItem): number {
		let subtotal = Math.round(item.quantity * item.unitAmount);
		if (item.discountPercent) {
			subtotal = Math.round(subtotal * (1 - item.discountPercent / 100));
		} else if (item.discountAmount) {
			subtotal = subtotal - item.discountAmount;
		}
		subtotal += item.setupFee ?? 0;
		return Math.max(0, subtotal);
	}

	const grandTotal = $derived(items.reduce((sum, item) => sum + lineTotal(item), 0));
	const totalDiscount = $derived(
		items.reduce((sum, item) => {
			const base = Math.round(item.quantity * item.unitAmount);
			const disc = item.discountPercent
				? Math.round(base * item.discountPercent / 100)
				: item.discountAmount ?? 0;
			return sum + disc;
		}, 0)
	);

	async function addProduct(productId: string, priceTierId: string | null) {
		try {
			await api(`/api/crm/opportunities/${opportunityId}/items`, {
				method: 'POST',
				body: JSON.stringify({ productId, priceTierId })
			});
			showToast('Product added');
			await invalidateAll();
		} catch {
			showToast('Failed to add product', 'error');
		}
	}

	async function updateItem(itemId: string, field: string, value: unknown) {
		try {
			await api(`/api/crm/opportunities/${opportunityId}/items/${itemId}`, {
				method: 'PATCH',
				body: JSON.stringify({ [field]: value })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to update item', 'error');
		}
	}

	async function removeItem(itemId: string) {
		try {
			await api(`/api/crm/opportunities/${opportunityId}/items/${itemId}`, { method: 'DELETE' });
			showToast('Item removed');
			await invalidateAll();
		} catch {
			showToast('Failed to remove item', 'error');
		}
	}

	async function syncValue() {
		try {
			await api(`/api/crm/opportunities/${opportunityId}`, {
				method: 'PATCH',
				body: JSON.stringify({ value: grandTotal })
			});
			showToast('Opportunity value updated');
			await invalidateAll();
		} catch {
			showToast('Failed to update value', 'error');
		}
	}

	function billingLabel(model: string | null, interval: string | null) {
		if (!model || model === 'one_time') return 'One-time';
		const m = model.replace('_', ' ');
		const i = interval ? '/' + interval.replace('_', '-') : '';
		return `${m}${i}`;
	}
</script>

<div>
	<div class="mb-4">
		<ProductPicker {products} onselect={addProduct} />
	</div>

	{#if items.length === 0}
		<p class="text-sm text-surface-500">No products added yet. Use the picker above to add products.</p>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-surface-300 dark:border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-300 bg-surface-100 dark:border-surface-800 dark:bg-surface-900">
					<tr>
						<th class="px-3 py-2 font-medium text-surface-700 dark:text-surface-300">Product</th>
						<th class="px-3 py-2 font-medium text-surface-700 dark:text-surface-300 w-20">Qty</th>
						<th class="px-3 py-2 font-medium text-surface-700 dark:text-surface-300 w-28">Unit Price</th>
						<th class="px-3 py-2 font-medium text-surface-700 dark:text-surface-300 w-24">Discount %</th>
						<th class="px-3 py-2 font-medium text-surface-700 dark:text-surface-300 w-24">Setup Fee</th>
						<th class="px-3 py-2 font-medium text-surface-700 dark:text-surface-300">Billing</th>
						<th class="px-3 py-2 font-medium text-surface-700 dark:text-surface-300 text-right">Total</th>
						<th class="px-3 py-2 w-10"></th>
					</tr>
				</thead>
				<tbody>
					{#each items as item (item.id)}
						<tr class="border-b border-surface-200 dark:border-surface-800">
							<td class="px-3 py-2">
								<p class="font-medium text-surface-900 dark:text-surface-100">{item.productName}</p>
								{#if item.productSku}
									<p class="text-[10px] text-surface-500">{item.productSku}</p>
								{/if}
							</td>
							<td class="px-3 py-2">
								<input
									type="number"
									step="0.01"
									value={item.quantity}
									onchange={(e) => updateItem(item.id, 'quantity', parseFloat(e.currentTarget.value))}
									class="w-16 rounded border border-surface-300 bg-surface-50 px-1.5 py-1 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
								/>
							</td>
							<td class="px-3 py-2">
								<input
									type="number"
									step="1"
									value={item.unitAmount}
									onchange={(e) => updateItem(item.id, 'unitAmount', parseInt(e.currentTarget.value))}
									class="w-24 rounded border border-surface-300 bg-surface-50 px-1.5 py-1 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
								/>
								<p class="text-[10px] text-surface-500 mt-0.5">{formatCurrency(item.unitAmount)}</p>
							</td>
							<td class="px-3 py-2">
								<input
									type="number"
									min="0"
									max="100"
									value={item.discountPercent ?? ''}
									onchange={(e) => updateItem(item.id, 'discountPercent', e.currentTarget.value ? parseInt(e.currentTarget.value) : null)}
									class="w-16 rounded border border-surface-300 bg-surface-50 px-1.5 py-1 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
									placeholder="0"
								/>
							</td>
							<td class="px-3 py-2 text-sm text-surface-500">
								{item.setupFee ? formatCurrency(item.setupFee) : '\u2014'}
							</td>
							<td class="px-3 py-2 text-xs text-surface-500 capitalize">
								{billingLabel(item.billingModel, item.billingInterval)}
							</td>
							<td class="px-3 py-2 text-right font-medium text-surface-900 dark:text-surface-100">
								{formatCurrency(lineTotal(item))}
							</td>
							<td class="px-3 py-2">
								<button
									onclick={() => removeItem(item.id)}
									class="text-red-500 hover:text-red-700"
									title="Remove"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
									</svg>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="mt-3 flex items-center justify-between">
			<button
				onclick={syncValue}
				class="rounded-md border border-surface-300 px-3 py-1.5 text-xs text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
			>
				Update Opportunity Value
			</button>
			<div class="text-right text-sm">
				{#if totalDiscount > 0}
					<p class="text-surface-500">Discount: -{formatCurrency(totalDiscount)}</p>
				{/if}
				<p class="font-semibold text-surface-900 dark:text-surface-100">Total: {formatCurrency(grandTotal)}</p>
			</div>
		</div>
	{/if}
</div>
