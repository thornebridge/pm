<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		open: boolean;
		onclose: () => void;
		product?: {
			id: string;
			name: string;
			sku: string | null;
			description: string | null;
			category: string | null;
			type: string;
			status: string;
			taxable: boolean;
		};
	}

	let { open, onclose, product }: Props = $props();

	let name = $state('');
	let sku = $state('');
	let description = $state('');
	let category = $state('');
	let type = $state('service');
	let taxable = $state(true);
	let saving = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	const isEdit = $derived(!!product);

	$effect(() => {
		if (open) {
			if (product) {
				name = product.name;
				sku = product.sku || '';
				description = product.description || '';
				category = product.category || '';
				type = product.type;
				taxable = product.taxable;
			} else {
				name = '';
				sku = '';
				description = '';
				category = '';
				type = 'service';
				taxable = true;
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
				sku: sku.trim() || null,
				description: description.trim() || null,
				category: category.trim() || null,
				type,
				taxable
			};

			if (isEdit) {
				await api(`/api/crm/products/${product!.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				showToast('Product updated');
			} else {
				await api('/api/crm/products', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				showToast('Product created');
			}
			onclose();
			await invalidateAll();
		} catch {
			showToast('Failed to save product', 'error');
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
					{isEdit ? 'Edit Product' : 'Add Product'}
				</h2>
			</div>
			<form onsubmit={(e) => { e.preventDefault(); save(); }} class="space-y-3 p-4">
				<div>
					<label for="prod-name" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Name *</label>
					<input id="prod-name" bind:this={inputEl} bind:value={name} placeholder="Product name" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="prod-sku" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">SKU</label>
						<input id="prod-sku" bind:value={sku} placeholder="SKU-001" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="prod-type" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Type</label>
						<select id="prod-type" bind:value={type} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="service">Service</option>
							<option value="product">Product</option>
							<option value="subscription">Subscription</option>
						</select>
					</div>
				</div>
				<div>
					<label for="prod-category" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Category</label>
					<input id="prod-category" bind:value={category} placeholder="e.g. Consulting, Software" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div>
					<label for="prod-desc" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Description</label>
					<textarea id="prod-desc" bind:value={description} rows={3} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"></textarea>
				</div>
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={taxable} class="rounded border-surface-300 dark:border-surface-600" />
					<span class="text-sm text-surface-700 dark:text-surface-300">Taxable</span>
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
