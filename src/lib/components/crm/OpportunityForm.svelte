<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';
	import { fly, fade } from 'svelte/transition';
	import { parseCurrency } from '$lib/utils/currency.js';

	interface Props {
		open: boolean;
		onclose: () => void;
		opportunity?: {
			id: string;
			title: string;
			companyId: string;
			contactId?: string | null;
			stageId: string;
			value?: number | null;
			currency?: string;
			probability?: number | null;
			expectedCloseDate?: number | null;
			priority?: string;
			source?: string | null;
			description?: string | null;
			ownerId?: string | null;
			nextStep?: string | null;
			nextStepDueDate?: number | null;
		};
		companies: Array<{ id: string; name: string }>;
		stages: Array<{ id: string; name: string; color: string }>;
		members: Array<{ id: string; name: string }>;
		prefilledCompanyId?: string;
		prefilledStageId?: string;
	}

	let { open, onclose, opportunity, companies, stages, members, prefilledCompanyId, prefilledStageId }: Props = $props();

	let title = $state('');
	let companyId = $state('');
	let stageId = $state('');
	let valueStr = $state('');
	let probability = $state('');
	let closeDateStr = $state('');
	let priority = $state('warm');
	let source = $state('');
	let description = $state('');
	let ownerId = $state('');
	let nextStep = $state('');
	let nextStepDueDateStr = $state('');
	let saving = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (open) {
			if (opportunity) {
				title = opportunity.title;
				companyId = opportunity.companyId;
				stageId = opportunity.stageId;
				valueStr = opportunity.value ? (opportunity.value / 100).toString() : '';
				probability = opportunity.probability?.toString() || '';
				closeDateStr = opportunity.expectedCloseDate
					? new Date(opportunity.expectedCloseDate).toISOString().split('T')[0]
					: '';
				priority = opportunity.priority || 'warm';
				source = opportunity.source || '';
				description = opportunity.description || '';
				ownerId = opportunity.ownerId || '';
				nextStep = opportunity.nextStep || '';
				nextStepDueDateStr = opportunity.nextStepDueDate
					? new Date(opportunity.nextStepDueDate).toISOString().split('T')[0]
					: '';
			} else {
				title = '';
				companyId = prefilledCompanyId || '';
				stageId = prefilledStageId || stages[0]?.id || '';
				valueStr = '';
				probability = '';
				closeDateStr = '';
				priority = 'warm';
				source = '';
				description = '';
				ownerId = '';
				nextStep = '';
				nextStepDueDateStr = '';
			}
			saving = false;
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	async function save() {
		if (!title.trim() || !companyId) return;
		saving = true;
		try {
			const value = valueStr ? parseCurrency(valueStr) : null;
			const expectedCloseDate = closeDateStr ? new Date(closeDateStr).getTime() : null;
			const prob = probability ? parseInt(probability) : null;

			const nextStepDueDate = nextStepDueDateStr ? new Date(nextStepDueDateStr).getTime() : null;

			const payload = {
				title: title.trim(),
				companyId,
				stageId: stageId || undefined,
				value,
				probability: prob,
				expectedCloseDate,
				priority,
				source: source || null,
				description: description || null,
				ownerId: ownerId || null,
				nextStep: nextStep.trim() || null,
				nextStepDueDate
			};

			if (opportunity) {
				await api(`/api/crm/opportunities/${opportunity.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				showToast('Opportunity updated');
			} else {
				await api('/api/crm/opportunities', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				showToast('Opportunity created');
			}
			onclose();
			await invalidateAll();
		} catch {
			showToast('Failed to save opportunity', 'error');
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
					{opportunity ? 'Edit Opportunity' : 'Add Opportunity'}
				</h2>
			</div>
			<form onsubmit={(e) => { e.preventDefault(); save(); }} class="space-y-3 p-4">
				<div>
					<label for="opp-title" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Title *</label>
					<input id="opp-title" bind:this={inputEl} bind:value={title} placeholder="Deal name" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="opp-company" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Company *</label>
						<select id="opp-company" bind:value={companyId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="">Select company</option>
							{#each companies as c}
								<option value={c.id}>{c.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="opp-stage" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Stage</label>
						<select id="opp-stage" bind:value={stageId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							{#each stages as s}
								<option value={s.id}>{s.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="opp-value" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Value ($)</label>
						<input id="opp-value" bind:value={valueStr} placeholder="10000" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="opp-prob" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Probability %</label>
						<input id="opp-prob" type="number" min="0" max="100" bind:value={probability} placeholder="50" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="opp-close" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Close Date</label>
						<input id="opp-close" type="date" bind:value={closeDateStr} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="opp-priority" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Priority</label>
						<select id="opp-priority" bind:value={priority} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="hot">Hot</option>
							<option value="warm">Warm</option>
							<option value="cold">Cold</option>
						</select>
					</div>
					<div>
						<label for="opp-source" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Source</label>
						<select id="opp-source" bind:value={source} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="">--</option>
							<option value="referral">Referral</option>
							<option value="inbound">Inbound</option>
							<option value="outbound">Outbound</option>
							<option value="website">Website</option>
							<option value="event">Event</option>
							<option value="partner">Partner</option>
							<option value="other">Other</option>
						</select>
					</div>
					<div>
						<label for="opp-owner" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Owner</label>
						<select id="opp-owner" bind:value={ownerId} class="w-full rounded-md border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
							<option value="">Unassigned</option>
							{#each members as m}
								<option value={m.id}>{m.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="grid grid-cols-3 gap-3">
					<div class="col-span-2">
						<label for="opp-next-step" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Next Step</label>
						<input id="opp-next-step" bind:value={nextStep} placeholder="e.g. Send pricing proposal" class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
					<div>
						<label for="opp-next-step-due" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Step Due</label>
						<input id="opp-next-step-due" type="date" bind:value={nextStepDueDateStr} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				</div>
				<div>
					<label for="opp-desc" class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Description</label>
					<textarea id="opp-desc" bind:value={description} rows={3} class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none placeholder:text-surface-500 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"></textarea>
				</div>
				<div class="flex items-center justify-between pt-1">
					<span class="text-[10px] text-surface-400">Ctrl+Enter to save</span>
					<div class="flex gap-2">
						<button type="button" onclick={onclose} class="rounded-md px-3 py-1.5 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100">Cancel</button>
						<button type="submit" disabled={saving || !title.trim() || !companyId} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
							{saving ? 'Saving...' : opportunity ? 'Update' : 'Create'}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
