<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';
	import { parseCurrency, formatCurrency } from '$lib/utils/currency.js';

	interface ProposalItem {
		id: string;
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
		lineTotal: number;
	}

	interface Props {
		open: boolean;
		onclose: () => void;
		opportunityId?: string;
		proposal?: {
			id: string;
			opportunityId: string;
			title: string;
			description: string | null;
			amount: number | null;
			status: string;
			expiresAt: number | null;
		};
	}

	let { open, onclose, opportunityId: prefilledOppId, proposal }: Props = $props();

	let opportunityId = $state('');
	let title = $state('');
	let description = $state('');
	let amountStr = $state('');
	let expiresDateStr = $state('');
	let saving = $state(false);
	let importing = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();
	let items = $state<ProposalItem[]>([]);

	const isEdit = $derived(!!proposal);
	const isDraft = $derived(!proposal || proposal.status === 'draft');

	// Load opportunities for dropdown
	let opportunities = $state<Array<{ id: string; title: string }>>([]);

	$effect(() => {
		if (open) {
			if (proposal) {
				opportunityId = proposal.opportunityId;
				title = proposal.title;
				description = proposal.description || '';
				amountStr = proposal.amount ? (proposal.amount / 100).toString() : '';
				expiresDateStr = proposal.expiresAt
					? new Date(proposal.expiresAt).toISOString().split('T')[0]
					: '';
				loadItems(proposal.id);
			} else {
				opportunityId = prefilledOppId || '';
				title = '';
				description = '';
				amountStr = '';
				expiresDateStr = '';
				items = [];
			}
			saving = false;
			importing = false;
			loadOpportunities();
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	async function loadOpportunities() {
		try {
			const opps = await api<Array<{ id: string; title: string }>>('/api/crm/opportunities?limit=200');
			opportunities = opps;
		} catch {
			opportunities = [];
		}
	}

	async function loadItems(proposalId: string) {
		try {
			items = await api<ProposalItem[]>(`/api/crm/proposals/${proposalId}/items`);
		} catch {
			items = [];
		}
	}

	async function save() {
		if (!title.trim() || !opportunityId) return;
		saving = true;
		try {
			const amount = amountStr ? parseCurrency(amountStr) : null;
			const expiresAt = expiresDateStr ? new Date(expiresDateStr).getTime() : null;

			if (isEdit) {
				await api(`/api/crm/proposals/${proposal!.id}`, {
					method: 'PATCH',
					body: JSON.stringify({
						title: title.trim(),
						description: description || null,
						amount,
						expiresAt
					})
				});
				showToast('Proposal updated');
			} else {
				await api('/api/crm/proposals', {
					method: 'POST',
					body: JSON.stringify({
						opportunityId,
						title: title.trim(),
						description: description || null,
						amount,
						expiresAt
					})
				});
				showToast('Proposal created');
			}
			onclose();
			await invalidateAll();
		} catch {
			showToast('Failed to save proposal', 'error');
		} finally {
			saving = false;
		}
	}

	async function importFromOpportunity() {
		if (!proposal) return;
		importing = true;
		try {
			await api(`/api/crm/proposals/${proposal.id}/items/from-opportunity`, {
				method: 'POST'
			});
			showToast('Items imported from opportunity');
			await loadItems(proposal.id);
			await invalidateAll();
		} catch {
			showToast('Failed to import items', 'error');
		} finally {
			importing = false;
		}
	}

	async function removeItem(itemId: string) {
		if (!proposal) return;
		try {
			await api(`/api/crm/proposals/${proposal.id}/items/${itemId}`, { method: 'DELETE' });
			items = items.filter((i) => i.id !== itemId);
			await invalidateAll();
		} catch {
			showToast('Failed to remove item', 'error');
		}
	}

	const itemsTotal = $derived(items.reduce((sum, i) => sum + i.lineTotal, 0));

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
			class="w-full max-w-2xl rounded-xl border border-surface-300 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
			transition:fly={{ y: -10, duration: 200 }}
		>
			<div class="border-b border-surface-300 px-4 py-3 dark:border-surface-800">
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
					{isEdit ? 'Edit Proposal' : 'Create Proposal'}
				</h2>
			</div>
			<form onsubmit={(e) => { e.preventDefault(); save(); }} class="space-y-3 p-4">
				{#if !isEdit}
					<div>
						<label for="proposal-opp" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Opportunity *</label>
						<select id="proposal-opp" bind:value={opportunityId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="">Select opportunity</option>
							{#each opportunities as o}
								<option value={o.id}>{o.title}</option>
							{/each}
						</select>
					</div>
				{/if}
				<div>
					<label for="proposal-title" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Title *</label>
					<input id="proposal-title" bind:this={inputEl} bind:value={title} placeholder="Proposal title" disabled={!isDraft} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div>
					<label for="proposal-desc" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Description</label>
					<textarea id="proposal-desc" bind:value={description} rows={2} disabled={!isDraft} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"></textarea>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="proposal-amount" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Amount ($)</label>
						<input id="proposal-amount" bind:value={amountStr} placeholder="10000" disabled={!isDraft} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="proposal-expires" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Expires</label>
						<input id="proposal-expires" type="date" bind:value={expiresDateStr} disabled={!isDraft} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>

				<!-- Line Items -->
				{#if isEdit}
					<div class="border-t border-surface-200 pt-3 dark:border-surface-800">
						<div class="mb-2 flex items-center justify-between">
							<h3 class="text-xs font-semibold uppercase tracking-wider text-surface-500">Line Items</h3>
							{#if isDraft}
								<button
									type="button"
									onclick={importFromOpportunity}
									disabled={importing}
									class="rounded-md border border-brand-300 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-700 dark:text-brand-400 dark:hover:bg-brand-900/20"
								>
									{importing ? 'Importing...' : 'Import from Opportunity'}
								</button>
							{/if}
						</div>
						{#if items.length === 0}
							<p class="text-xs text-surface-500">No line items. Click "Import from Opportunity" to snapshot products.</p>
						{:else}
							<div class="space-y-1.5">
								{#each items as item (item.id)}
									<div class="flex items-center justify-between rounded border border-surface-200 bg-surface-100 px-2.5 py-1.5 text-xs dark:border-surface-700 dark:bg-surface-800">
										<div class="flex-1">
											<span class="font-medium text-surface-900 dark:text-surface-100">{item.productName}</span>
											{#if item.productSku}
												<span class="ml-1 text-surface-500">({item.productSku})</span>
											{/if}
											<span class="ml-2 text-surface-500">
												{item.quantity} x {formatCurrency(item.unitAmount)}
												{#if item.discountPercent}
													<span class="text-red-500">-{item.discountPercent}%</span>
												{/if}
											</span>
										</div>
										<div class="flex items-center gap-2">
											<span class="font-medium text-surface-900 dark:text-surface-100">{formatCurrency(item.lineTotal)}</span>
											{#if isDraft}
												<button
													type="button"
													onclick={() => removeItem(item.id)}
													class="text-red-500 hover:text-red-700"
												>
													&times;
												</button>
											{/if}
										</div>
									</div>
								{/each}
							</div>
							<div class="mt-2 text-right text-xs font-semibold text-surface-900 dark:text-surface-100">
								Total: {formatCurrency(itemsTotal)}
							</div>
						{/if}
					</div>
				{/if}

				<div class="flex items-center justify-between pt-1">
					<span class="text-[10px] text-surface-400">Ctrl+Enter to save</span>
					<div class="flex gap-2">
						<button type="button" onclick={onclose} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</button>
						{#if isDraft}
							<button type="submit" disabled={saving || !title.trim() || !opportunityId} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
								{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
							</button>
						{/if}
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
