<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';
	import { formatCurrency } from '$lib/utils/currency.js';

	interface FieldDef {
		id: string;
		entityType: string;
		fieldName: string;
		label: string;
		fieldType: string;
		options: string[] | null;
		required: boolean;
		position: number;
	}

	interface Props {
		entityType: 'company' | 'contact' | 'opportunity' | 'lead';
		entityId: string;
	}

	let { entityType, entityId }: Props = $props();

	let defs = $state<FieldDef[]>([]);
	let values = $state<Record<string, string | null>>({});
	let loading = $state(true);
	let editingField = $state<string | null>(null);
	let editValue = $state('');

	async function loadFields() {
		loading = true;
		try {
			const data: { defs: FieldDef[]; values: Record<string, string | null> } = await api(`/api/crm/custom-fields/values?entityId=${entityId}&entityType=${entityType}`);
			defs = data.defs;
			values = data.values;
		} catch {
			// silently fail — may have no custom fields
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (entityId && entityType) {
			loadFields();
		}
	});

	async function saveField(fieldDefId: string, newValue: string | null) {
		try {
			await api('/api/crm/custom-fields/values', {
				method: 'PUT',
				body: JSON.stringify({ entityId, values: { [fieldDefId]: newValue } })
			});
			values[fieldDefId] = newValue;
			editingField = null;
		} catch {
			showToast('Failed to save field', 'error');
		}
	}

	function startEdit(fieldId: string) {
		editingField = fieldId;
		editValue = values[fieldId] || '';
	}

	function displayValue(def: FieldDef, val: string | null): string {
		if (!val) return '\u2014';
		switch (def.fieldType) {
			case 'boolean': return val === 'true' ? 'Yes' : 'No';
			case 'date': return new Date(parseInt(val)).toLocaleDateString();
			case 'currency': return formatCurrency(parseInt(val));
			case 'multi_select': {
				try { return JSON.parse(val).join(', '); }
				catch { return val; }
			}
			default: return val;
		}
	}
</script>

{#if !loading && defs.length > 0}
	<div class="space-y-2">
		{#each defs as def (def.id)}
			{@const val = values[def.id] ?? null}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="flex items-start gap-3 py-1.5">
				<span class="w-36 shrink-0 text-xs text-surface-500 pt-0.5">{def.label}</span>
				{#if editingField === def.id}
					<div class="flex flex-1 items-center gap-2">
						{#if def.fieldType === 'select' && def.options}
							<select
								bind:value={editValue}
								class="flex-1 rounded border border-surface-300 bg-white px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
							>
								<option value="">--</option>
								{#each def.options as opt}
									<option value={opt}>{opt}</option>
								{/each}
							</select>
						{:else if def.fieldType === 'boolean'}
							<select
								bind:value={editValue}
								class="flex-1 rounded border border-surface-300 bg-white px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
							>
								<option value="">--</option>
								<option value="true">Yes</option>
								<option value="false">No</option>
							</select>
						{:else if def.fieldType === 'date'}
							<input
								type="date"
								value={editValue ? new Date(parseInt(editValue)).toISOString().split('T')[0] : ''}
								onchange={(e) => { editValue = (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value).getTime().toString() : ''; }}
								class="flex-1 rounded border border-surface-300 bg-white px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
							/>
						{:else if def.fieldType === 'number' || def.fieldType === 'currency'}
							<input
								type="number"
								bind:value={editValue}
								class="flex-1 rounded border border-surface-300 bg-white px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
							/>
						{:else}
							<input
								type={def.fieldType === 'url' ? 'url' : def.fieldType === 'email' ? 'email' : 'text'}
								bind:value={editValue}
								class="flex-1 rounded border border-surface-300 bg-white px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
							/>
						{/if}
						<button onclick={() => saveField(def.id, editValue || null)} class="text-xs text-brand-600 hover:text-brand-500">Save</button>
						<button onclick={() => (editingField = null)} class="text-xs text-surface-400 hover:text-surface-600">Cancel</button>
					</div>
				{:else}
					<div
						class="flex-1 cursor-pointer rounded px-1 py-0.5 text-sm text-surface-900 hover:bg-surface-100 dark:text-surface-100 dark:hover:bg-surface-800"
						onclick={() => startEdit(def.id)}
					>
						{displayValue(def, val)}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{:else if !loading}
	<p class="text-xs text-surface-400">No custom fields configured.</p>
{/if}
