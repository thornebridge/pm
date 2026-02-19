<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import TriggerStep from './TriggerStep.svelte';
	import ConditionsStep from './ConditionsStep.svelte';
	import ActionsStep from './ActionsStep.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface AutomationData {
		id?: string;
		name: string;
		description: string;
		trigger: { event: string; config?: Record<string, unknown> };
		conditions: Array<{ field: string; operator: string; value?: string | string[] }>;
		actions: Array<Record<string, unknown>>;
		enabled: boolean;
	}

	interface Props {
		open: boolean;
		onclose: () => void;
		onsave: (data: AutomationData) => void;
		initial?: AutomationData | null;
		statuses: Array<{ id: string; name: string }>;
		members: Array<{ id: string; name: string }>;
		labels: Array<{ id: string; name: string }>;
	}

	let { open, onclose, onsave, initial = null, statuses, members, labels }: Props = $props();

	let name = $state('');
	let description = $state('');
	let trigger = $state<{ event: string; config?: Record<string, unknown> }>({ event: 'task.created' });
	let conditions = $state<Array<{ field: string; operator: string; value?: string | string[] }>>([]);
	let actions = $state<Array<Record<string, unknown>>>([{ type: 'set_field', field: 'statusId', value: '' }]);
	let enabled = $state(true);
	let saving = $state(false);

	$effect(() => {
		if (open && initial) {
			name = initial.name;
			description = initial.description || '';
			trigger = { ...initial.trigger };
			conditions = initial.conditions
				? (Array.isArray(initial.conditions) && initial.conditions[0]?.conditions
					? (initial.conditions as Array<{ conditions: Array<{ field: string; operator: string; value?: string | string[] }> }>)[0].conditions.map((c: { field: string; operator: string; value?: string | string[] }) => ({ ...c }))
					: (initial.conditions as Array<{ field: string; operator: string; value?: string | string[] }>).map((c: { field: string; operator: string; value?: string | string[] }) => ({ ...c })))
				: [];
			actions = initial.actions.map((a: Record<string, unknown>) => ({ ...a }));
			enabled = initial.enabled !== false;
		} else if (open && !initial) {
			name = '';
			description = '';
			trigger = { event: 'task.created' };
			conditions = [];
			actions = [{ type: 'set_field', field: 'statusId', value: '' }];
			enabled = true;
		}
	});

	async function handleSave() {
		if (!name.trim()) return;
		saving = true;
		try {
			await onsave({
				id: initial?.id,
				name: name.trim(),
				description: description.trim(),
				trigger,
				conditions,
				actions,
				enabled
			});
			onclose();
		} finally {
			saving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-12"
		onkeydown={handleKeydown}
		onclick={handleBackdrop}
	>
		<div class="absolute inset-0 bg-black/40 dark:bg-black/60" transition:fade={{ duration: 150 }}></div>
		<div
			class="relative w-full max-w-2xl rounded-lg border border-surface-300 bg-surface-50 shadow-xl dark:border-surface-700 dark:bg-surface-900"
			role="dialog"
			aria-modal="true"
			transition:scale={{ start: 0.95, duration: 150 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-surface-300 px-5 py-3 dark:border-surface-800">
				<h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
					{initial?.id ? 'Edit Automation' : 'New Automation'}
				</h2>
				<button onclick={onclose} class="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">&times;</button>
			</div>

			<div class="space-y-5 p-5">
				<!-- Name & Description -->
				<div class="space-y-2">
					<input
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						placeholder="Automation name..."
						bind:value={name}
					/>
					<input
						class="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-1.5 text-xs text-surface-700 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
						placeholder="Description (optional)..."
						bind:value={description}
					/>
				</div>

				<!-- WHEN trigger -->
				<div>
					<div class="mb-2 flex items-center gap-2">
						<span class="rounded bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">WHEN</span>
					</div>
					<div class="rounded-md border border-brand-200 bg-brand-50/30 p-3 dark:border-brand-900/50 dark:bg-brand-950/20">
						<TriggerStep {trigger} {statuses} onchange={(t) => (trigger = t)} />
					</div>
				</div>

				<!-- Connector -->
				<div class="flex justify-center">
					<div class="h-4 w-px bg-surface-300 dark:bg-surface-700"></div>
				</div>

				<!-- IF conditions -->
				<div>
					<div class="mb-2 flex items-center gap-2">
						<span class="rounded bg-surface-200 px-2 py-0.5 text-xs font-semibold text-surface-600 dark:bg-surface-700 dark:text-surface-300">IF</span>
						<span class="text-xs text-surface-400 dark:text-surface-500">(optional)</span>
					</div>
					<div class="rounded-md border border-surface-200 bg-surface-100/50 p-3 dark:border-surface-700 dark:bg-surface-800/50">
						<ConditionsStep {conditions} {statuses} {members} {labels} onchange={(c) => (conditions = c)} />
					</div>
				</div>

				<!-- Connector -->
				<div class="flex justify-center">
					<div class="h-4 w-px bg-surface-300 dark:bg-surface-700"></div>
				</div>

				<!-- THEN actions -->
				<div>
					<div class="mb-2 flex items-center gap-2">
						<span class="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">THEN</span>
					</div>
					<div class="rounded-md border border-amber-200 bg-amber-50/30 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
						<ActionsStep {actions} {statuses} {members} {labels} onchange={(a) => (actions = a)} />
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between border-t border-surface-300 px-5 py-3 dark:border-surface-800">
				<label class="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-400">
					<input type="checkbox" bind:checked={enabled} class="rounded" />
					Enabled
				</label>
				<div class="flex gap-2">
					<Button variant="secondary" size="sm" onclick={onclose}>Cancel</Button>
					<Button size="sm" onclick={handleSave} disabled={saving || !name.trim() || actions.length === 0}>
						{saving ? 'Saving...' : initial?.id ? 'Update' : 'Create'}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
