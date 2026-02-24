<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	// -- Top-level tab --
	let settingsTab = $state<'pipeline' | 'lead-statuses' | 'custom-fields'>('pipeline');

	// ========== Lead Statuses ==========
	let lsEditingId = $state<string | null>(null);
	let lsEditName = $state('');
	let lsEditColor = $state('');
	let lsEditIsConverted = $state(false);
	let lsEditIsDisqualified = $state(false);

	let lsShowAdd = $state(false);
	let lsNewName = $state('');
	let lsNewColor = $state('#6366f1');
	let lsNewIsConverted = $state(false);
	let lsNewIsDisqualified = $state(false);

	function startLsEdit(status: typeof data.leadStatuses[0]) {
		lsEditingId = status.id;
		lsEditName = status.name;
		lsEditColor = status.color;
		lsEditIsConverted = status.isConverted;
		lsEditIsDisqualified = status.isDisqualified;
	}

	async function saveLsEdit() {
		if (!lsEditingId || !lsEditName.trim()) return;
		try {
			await api('/api/crm/lead-statuses', {
				method: 'PATCH',
				body: JSON.stringify({
					statuses: [{
						id: lsEditingId,
						name: lsEditName.trim(),
						color: lsEditColor,
						isConverted: lsEditIsConverted,
						isDisqualified: lsEditIsDisqualified
					}]
				})
			});
			lsEditingId = null;
			showToast('Status updated');
			await invalidateAll();
		} catch {
			showToast('Failed to update status', 'error');
		}
	}

	async function addLeadStatus() {
		if (!lsNewName.trim()) return;
		try {
			await api('/api/crm/lead-statuses', {
				method: 'POST',
				body: JSON.stringify({
					name: lsNewName.trim(),
					color: lsNewColor,
					isConverted: lsNewIsConverted,
					isDisqualified: lsNewIsDisqualified
				})
			});
			lsShowAdd = false;
			lsNewName = '';
			lsNewColor = '#6366f1';
			lsNewIsConverted = false;
			lsNewIsDisqualified = false;
			showToast('Status created');
			await invalidateAll();
		} catch {
			showToast('Failed to create status', 'error');
		}
	}

	async function deleteLeadStatus(id: string) {
		if (!confirm('Delete this lead status?')) return;
		try {
			await api('/api/crm/lead-statuses', {
				method: 'DELETE',
				body: JSON.stringify({ id })
			});
			showToast('Status deleted');
			await invalidateAll();
		} catch {
			showToast('Failed to delete status', 'error');
		}
	}

	async function moveLeadStatus(id: string, direction: 'up' | 'down') {
		const sorted = [...data.leadStatuses].sort((a, b) => a.position - b.position);
		const idx = sorted.findIndex((s) => s.id === id);
		const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
		if (swapIdx < 0 || swapIdx >= sorted.length) return;

		try {
			await api('/api/crm/lead-statuses', {
				method: 'PATCH',
				body: JSON.stringify({
					statuses: [
						{ id: sorted[idx].id, position: sorted[swapIdx].position },
						{ id: sorted[swapIdx].id, position: sorted[idx].position }
					]
				})
			});
			await invalidateAll();
		} catch {
			showToast('Failed to reorder statuses', 'error');
		}
	}

	// ========== Pipeline Stages ==========
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editColor = $state('');
	let editProbability = $state(0);
	let editIsClosed = $state(false);
	let editIsWon = $state(false);

	let showAdd = $state(false);
	let newName = $state('');
	let newColor = $state('#6366f1');
	let newProbability = $state(0);
	let newIsClosed = $state(false);
	let newIsWon = $state(false);

	function startEdit(stage: typeof data.stages[0]) {
		editingId = stage.id;
		editName = stage.name;
		editColor = stage.color;
		editProbability = stage.probability;
		editIsClosed = stage.isClosed;
		editIsWon = stage.isWon;
	}

	async function saveEdit() {
		if (!editingId || !editName.trim()) return;
		try {
			await api(`/api/crm/pipeline-stages/${editingId}`, {
				method: 'PATCH',
				body: JSON.stringify({
					name: editName.trim(),
					color: editColor,
					probability: editProbability,
					isClosed: editIsClosed,
					isWon: editIsWon
				})
			});
			editingId = null;
			showToast('Stage updated');
			await invalidateAll();
		} catch {
			showToast('Failed to update stage', 'error');
		}
	}

	async function addStage() {
		if (!newName.trim()) return;
		try {
			await api('/api/crm/pipeline-stages', {
				method: 'POST',
				body: JSON.stringify({
					name: newName.trim(),
					color: newColor,
					probability: newProbability,
					isClosed: newIsClosed,
					isWon: newIsWon
				})
			});
			showAdd = false;
			newName = '';
			newColor = '#6366f1';
			newProbability = 0;
			newIsClosed = false;
			newIsWon = false;
			showToast('Stage created');
			await invalidateAll();
		} catch {
			showToast('Failed to create stage', 'error');
		}
	}

	async function deleteStage(id: string) {
		if (!confirm('Delete this pipeline stage?')) return;
		try {
			await api(`/api/crm/pipeline-stages/${id}`, { method: 'DELETE' });
			showToast('Stage deleted');
			await invalidateAll();
		} catch (e) {
			showToast(e instanceof Error ? e.message : 'Failed to delete stage', 'error');
		}
	}

	async function moveStage(id: string, direction: 'up' | 'down') {
		const sorted = [...data.stages].sort((a, b) => a.position - b.position);
		const idx = sorted.findIndex((s) => s.id === id);
		const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
		if (swapIdx < 0 || swapIdx >= sorted.length) return;

		try {
			await api(`/api/crm/pipeline-stages/${sorted[idx].id}`, {
				method: 'PATCH',
				body: JSON.stringify({ position: sorted[swapIdx].position })
			});
			await api(`/api/crm/pipeline-stages/${sorted[swapIdx].id}`, {
				method: 'PATCH',
				body: JSON.stringify({ position: sorted[idx].position })
			});
			await invalidateAll();
		} catch {
			showToast('Failed to reorder stages', 'error');
		}
	}

	// ========== Custom Fields ==========
	interface FieldDef {
		id: string;
		entityType: string;
		fieldName: string;
		label: string;
		fieldType: string;
		options: string | null;
		required: boolean;
		position: number;
		showInList: boolean;
		showInCard: boolean;
	}

	const fieldTypes = [
		{ value: 'text', label: 'Text' },
		{ value: 'number', label: 'Number' },
		{ value: 'currency', label: 'Currency' },
		{ value: 'date', label: 'Date' },
		{ value: 'select', label: 'Dropdown' },
		{ value: 'multi_select', label: 'Multi Select' },
		{ value: 'boolean', label: 'Yes / No' },
		{ value: 'url', label: 'URL' },
		{ value: 'email', label: 'Email' }
	];

	let cfEntityTab = $state<'company' | 'contact' | 'opportunity' | 'lead'>('company');
	let cfFields = $state<FieldDef[]>([]);
	let cfLoading = $state(false);

	let cfShowAdd = $state(false);
	let cfNewLabel = $state('');
	let cfNewType = $state('text');
	let cfNewOptions = $state('');
	let cfNewRequired = $state(false);

	let cfEditingId = $state<string | null>(null);
	let cfEditLabel = $state('');
	let cfEditOptions = $state('');
	let cfEditRequired = $state(false);

	async function loadCustomFields() {
		cfLoading = true;
		try {
			const data = await api<FieldDef[]>(`/api/crm/custom-fields?entityType=${cfEntityTab}`);
			cfFields = data.map((d: FieldDef) => ({
				...d,
				options: d.options
			}));
		} catch {
			cfFields = [];
		} finally {
			cfLoading = false;
		}
	}

	$effect(() => {
		if (settingsTab === 'custom-fields') {
			loadCustomFields();
		}
	});

	// Re-load when entity tab changes
	$effect(() => {
		cfEntityTab;
		if (settingsTab === 'custom-fields') {
			loadCustomFields();
		}
	});

	async function addCustomField() {
		if (!cfNewLabel.trim()) return;
		const fieldName = cfNewLabel.trim().replace(/\s+/g, '_').toLowerCase();
		const options = (cfNewType === 'select' || cfNewType === 'multi_select')
			? cfNewOptions.split(',').map((o) => o.trim()).filter(Boolean)
			: null;

		try {
			await api('/api/crm/custom-fields', {
				method: 'POST',
				body: JSON.stringify({
					entityType: cfEntityTab,
					fieldName,
					label: cfNewLabel.trim(),
					fieldType: cfNewType,
					options,
					required: cfNewRequired
				})
			});
			cfShowAdd = false;
			cfNewLabel = '';
			cfNewType = 'text';
			cfNewOptions = '';
			cfNewRequired = false;
			showToast('Custom field created');
			await loadCustomFields();
		} catch {
			showToast('Failed to create field', 'error');
		}
	}

	function startCfEdit(field: FieldDef) {
		cfEditingId = field.id;
		cfEditLabel = field.label;
		cfEditOptions = field.options ? (() => { try { return JSON.parse(field.options!).join(', '); } catch { return ''; } })() : '';
		cfEditRequired = field.required;
	}

	async function saveCfEdit() {
		if (!cfEditingId || !cfEditLabel.trim()) return;
		const field = cfFields.find((f) => f.id === cfEditingId);
		const options = (field?.fieldType === 'select' || field?.fieldType === 'multi_select')
			? cfEditOptions.split(',').map((o) => o.trim()).filter(Boolean)
			: undefined;

		try {
			await api(`/api/crm/custom-fields/${cfEditingId}`, {
				method: 'PATCH',
				body: JSON.stringify({
					label: cfEditLabel.trim(),
					required: cfEditRequired,
					...(options !== undefined ? { options } : {})
				})
			});
			cfEditingId = null;
			showToast('Field updated');
			await loadCustomFields();
		} catch {
			showToast('Failed to update field', 'error');
		}
	}

	async function deleteCfField(id: string) {
		if (!confirm('Delete this custom field? All stored values will be lost.')) return;
		try {
			await api(`/api/crm/custom-fields/${id}`, { method: 'DELETE' });
			showToast('Field deleted');
			await loadCustomFields();
		} catch {
			showToast('Failed to delete field', 'error');
		}
	}

	async function moveCfField(id: string, direction: 'up' | 'down') {
		const sorted = [...cfFields].sort((a, b) => a.position - b.position);
		const idx = sorted.findIndex((f) => f.id === id);
		const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
		if (swapIdx < 0 || swapIdx >= sorted.length) return;

		try {
			await api(`/api/crm/custom-fields/${sorted[idx].id}`, {
				method: 'PATCH',
				body: JSON.stringify({ position: sorted[swapIdx].position })
			});
			await api(`/api/crm/custom-fields/${sorted[swapIdx].id}`, {
				method: 'PATCH',
				body: JSON.stringify({ position: sorted[idx].position })
			});
			await loadCustomFields();
		} catch {
			showToast('Failed to reorder fields', 'error');
		}
	}

	// ========== Financial Services Presets ==========
	const lendingPresets: Record<string, { label: string; fieldType: string; options?: string[] }[]> = {
		company: [
			{ label: 'License Type', fieldType: 'select', options: ['Direct Lender', 'Brokerage', 'ISO', 'MCA Provider', 'Equipment Finance', 'SBA Lender'] },
			{ label: 'States Licensed', fieldType: 'text' },
			{ label: 'Monthly Volume', fieldType: 'currency' },
			{ label: 'Average Deal Size', fieldType: 'currency' },
			{ label: 'Current LOS/CRM', fieldType: 'text' },
			{ label: 'Contract Expiry', fieldType: 'date' },
			{ label: 'Broker Count', fieldType: 'number' }
		],
		contact: [
			{ label: 'Department', fieldType: 'select', options: ['Executive', 'Operations', 'Sales', 'IT', 'Compliance', 'Finance'] },
			{ label: 'Decision Authority', fieldType: 'select', options: ['Final Decision Maker', 'Strong Influence', 'Recommender', 'Evaluator', 'End User'] },
			{ label: 'LinkedIn URL', fieldType: 'url' },
			{ label: 'Previous Vendor Experience', fieldType: 'text' }
		],
		opportunity: [
			{ label: 'Implementation Timeline', fieldType: 'select', options: ['Immediate (< 30 days)', '1-3 Months', '3-6 Months', '6+ Months'] },
			{ label: 'Seat Count', fieldType: 'number' },
			{ label: 'Seat Tier', fieldType: 'select', options: ['Support ($99/mo)', 'Full Platform ($199/mo)', 'Mixed'] },
			{ label: 'Current Pain Points', fieldType: 'multi_select', options: ['Manual Processes', 'No Dialer', 'Poor Reporting', 'Compliance Gaps', 'Broker Turnover', 'Slow Funding'] },
			{ label: 'Competitive Situation', fieldType: 'select', options: ['Greenfield', 'Displacing Incumbent', 'Evaluating Multiple', 'Renewal Risk'] },
			{ label: 'Champion Confirmed', fieldType: 'boolean' },
			{ label: 'IT Requirements Gathered', fieldType: 'boolean' },
			{ label: 'Annual Contract Value', fieldType: 'currency' }
		]
	};

	let presetsLoading = $state(false);

	async function installPresets() {
		if (!confirm(`Install financial services preset fields for ${cfEntityTab} records? This won't overwrite existing fields.`)) return;
		presetsLoading = true;
		const presets = lendingPresets[cfEntityTab] || [];
		const existingLabels = new Set(cfFields.map((f) => f.label.toLowerCase()));
		let added = 0;

		for (const preset of presets) {
			if (existingLabels.has(preset.label.toLowerCase())) continue;
			try {
				await api('/api/crm/custom-fields', {
					method: 'POST',
					body: JSON.stringify({
						entityType: cfEntityTab,
						fieldName: preset.label.replace(/\s+/g, '_').toLowerCase(),
						label: preset.label,
						fieldType: preset.fieldType,
						options: preset.options || null,
						required: false
					})
				});
				added++;
			} catch { /* skip duplicates */ }
		}

		presetsLoading = false;
		showToast(`Added ${added} preset field${added !== 1 ? 's' : ''}`);
		await loadCustomFields();
	}
</script>

<svelte:head>
	<title>CRM Settings</title>
</svelte:head>

<div class="p-6">
	<h1 class="mb-4 text-lg font-semibold text-surface-900 dark:text-surface-100">CRM Settings</h1>

	<!-- Top-level tabs -->
	<div class="mb-6 flex gap-4 border-b border-surface-300 dark:border-surface-800">
		{#each [{ key: 'pipeline', label: 'Pipeline Stages' }, { key: 'lead-statuses', label: 'Lead Statuses' }, { key: 'custom-fields', label: 'Custom Fields' }] as t}
			<button
				onclick={() => (settingsTab = t.key as typeof settingsTab)}
				class="border-b-2 px-1 pb-2 text-sm font-medium transition {settingsTab === t.key ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}"
			>
				{t.label}
			</button>
		{/each}
	</div>

	<!-- ======== Pipeline Stages ======== -->
	{#if settingsTab === 'pipeline'}
		<div class="rounded-lg border border-surface-300 dark:border-surface-800">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-surface-300 bg-surface-100 dark:border-surface-800 dark:bg-surface-900">
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Order</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Name</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Color</th>
						<th class="px-4 py-2 text-center font-medium text-surface-600 dark:text-surface-400">Probability</th>
						<th class="px-4 py-2 text-center font-medium text-surface-600 dark:text-surface-400">Closed</th>
						<th class="px-4 py-2 text-center font-medium text-surface-600 dark:text-surface-400">Won</th>
						<th class="px-4 py-2 text-right font-medium text-surface-600 dark:text-surface-400">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each [...data.stages].sort((a, b) => a.position - b.position) as stage, i (stage.id)}
						<tr class="border-b border-surface-200 dark:border-surface-800">
							{#if editingId === stage.id}
								<td class="px-4 py-2">{i + 1}</td>
								<td class="px-4 py-2">
									<input bind:value={editName} class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
								</td>
								<td class="px-4 py-2">
									<input type="color" bind:value={editColor} class="h-6 w-8 cursor-pointer" />
								</td>
								<td class="px-4 py-2 text-center">
									<input type="number" min="0" max="100" bind:value={editProbability} class="w-16 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-center text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
								</td>
								<td class="px-4 py-2 text-center">
									<input type="checkbox" bind:checked={editIsClosed} />
								</td>
								<td class="px-4 py-2 text-center">
									<input type="checkbox" bind:checked={editIsWon} />
								</td>
								<td class="px-4 py-2 text-right">
									<button onclick={saveEdit} class="text-xs text-brand-500 hover:underline">Save</button>
									<button onclick={() => (editingId = null)} class="ml-2 text-xs text-surface-500 hover:underline">Cancel</button>
								</td>
							{:else}
								<td class="px-4 py-2 text-surface-500">
									<div class="flex items-center gap-1">
										<button onclick={() => moveStage(stage.id, 'up')} disabled={i === 0} class="text-surface-400 hover:text-surface-600 disabled:opacity-30">&uarr;</button>
										<button onclick={() => moveStage(stage.id, 'down')} disabled={i === data.stages.length - 1} class="text-surface-400 hover:text-surface-600 disabled:opacity-30">&darr;</button>
									</div>
								</td>
								<td class="px-4 py-2 text-surface-900 dark:text-surface-100">{stage.name}</td>
								<td class="px-4 py-2">
									<div class="h-4 w-4 rounded-full" style="background-color: {stage.color}"></div>
								</td>
								<td class="px-4 py-2 text-center text-surface-600 dark:text-surface-400">{stage.probability}%</td>
								<td class="px-4 py-2 text-center text-surface-600 dark:text-surface-400">{stage.isClosed ? 'Yes' : ''}</td>
								<td class="px-4 py-2 text-center text-surface-600 dark:text-surface-400">{stage.isWon ? 'Yes' : ''}</td>
								<td class="px-4 py-2 text-right">
									<button onclick={() => startEdit(stage)} class="text-xs text-brand-500 hover:underline">Edit</button>
									<button onclick={() => deleteStage(stage.id)} class="ml-2 text-xs text-red-500 hover:underline">Delete</button>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if showAdd}
			<div class="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
				<div>
					<label class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Name</label>
					<input bind:value={newName} class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Color</label>
					<input type="color" bind:value={newColor} class="h-8 w-10" />
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Probability</label>
					<input type="number" min="0" max="100" bind:value={newProbability} class="w-16 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<label class="flex items-center gap-1 text-sm text-surface-700 dark:text-surface-300">
					<input type="checkbox" bind:checked={newIsClosed} /> Closed
				</label>
				<label class="flex items-center gap-1 text-sm text-surface-700 dark:text-surface-300">
					<input type="checkbox" bind:checked={newIsWon} /> Won
				</label>
				<button onclick={addStage} disabled={!newName.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
					Add Stage
				</button>
				<button onclick={() => (showAdd = false)} class="text-sm text-surface-500 hover:text-surface-700">Cancel</button>
			</div>
		{:else}
			<button onclick={() => (showAdd = true)} class="mt-4 rounded-md border border-dashed border-surface-400 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-800">
				+ Add Stage
			</button>
		{/if}
	{/if}

	<!-- ======== Lead Statuses ======== -->
	{#if settingsTab === 'lead-statuses'}
		<div class="rounded-lg border border-surface-300 dark:border-surface-800">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-surface-300 bg-surface-100 dark:border-surface-800 dark:bg-surface-900">
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Order</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Name</th>
						<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Color</th>
						<th class="px-4 py-2 text-center font-medium text-surface-600 dark:text-surface-400">Converted</th>
						<th class="px-4 py-2 text-center font-medium text-surface-600 dark:text-surface-400">Disqualified</th>
						<th class="px-4 py-2 text-right font-medium text-surface-600 dark:text-surface-400">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each [...data.leadStatuses].sort((a, b) => a.position - b.position) as status, i (status.id)}
						<tr class="border-b border-surface-200 dark:border-surface-800">
							{#if lsEditingId === status.id}
								<td class="px-4 py-2">{i + 1}</td>
								<td class="px-4 py-2">
									<input bind:value={lsEditName} class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
								</td>
								<td class="px-4 py-2">
									<input type="color" bind:value={lsEditColor} class="h-6 w-8 cursor-pointer" />
								</td>
								<td class="px-4 py-2 text-center">
									<input type="checkbox" bind:checked={lsEditIsConverted} />
								</td>
								<td class="px-4 py-2 text-center">
									<input type="checkbox" bind:checked={lsEditIsDisqualified} />
								</td>
								<td class="px-4 py-2 text-right">
									<button onclick={saveLsEdit} class="text-xs text-brand-500 hover:underline">Save</button>
									<button onclick={() => (lsEditingId = null)} class="ml-2 text-xs text-surface-500 hover:underline">Cancel</button>
								</td>
							{:else}
								<td class="px-4 py-2 text-surface-500">
									<div class="flex items-center gap-1">
										<button onclick={() => moveLeadStatus(status.id, 'up')} disabled={i === 0} class="text-surface-400 hover:text-surface-600 disabled:opacity-30">&uarr;</button>
										<button onclick={() => moveLeadStatus(status.id, 'down')} disabled={i === data.leadStatuses.length - 1} class="text-surface-400 hover:text-surface-600 disabled:opacity-30">&darr;</button>
									</div>
								</td>
								<td class="px-4 py-2 text-surface-900 dark:text-surface-100">{status.name}</td>
								<td class="px-4 py-2">
									<div class="h-4 w-4 rounded-full" style="background-color: {status.color}"></div>
								</td>
								<td class="px-4 py-2 text-center text-surface-600 dark:text-surface-400">{status.isConverted ? 'Yes' : ''}</td>
								<td class="px-4 py-2 text-center text-surface-600 dark:text-surface-400">{status.isDisqualified ? 'Yes' : ''}</td>
								<td class="px-4 py-2 text-right">
									<button onclick={() => startLsEdit(status)} class="text-xs text-brand-500 hover:underline">Edit</button>
									<button onclick={() => deleteLeadStatus(status.id)} class="ml-2 text-xs text-red-500 hover:underline">Delete</button>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if lsShowAdd}
			<div class="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
				<div>
					<label class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Name</label>
					<input bind:value={lsNewName} class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Color</label>
					<input type="color" bind:value={lsNewColor} class="h-8 w-10" />
				</div>
				<label class="flex items-center gap-1 text-sm text-surface-700 dark:text-surface-300">
					<input type="checkbox" bind:checked={lsNewIsConverted} /> Converted
				</label>
				<label class="flex items-center gap-1 text-sm text-surface-700 dark:text-surface-300">
					<input type="checkbox" bind:checked={lsNewIsDisqualified} /> Disqualified
				</label>
				<button onclick={addLeadStatus} disabled={!lsNewName.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
					Add Status
				</button>
				<button onclick={() => (lsShowAdd = false)} class="text-sm text-surface-500 hover:text-surface-700">Cancel</button>
			</div>
		{:else}
			<button onclick={() => (lsShowAdd = true)} class="mt-4 rounded-md border border-dashed border-surface-400 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-800">
				+ Add Status
			</button>
		{/if}
	{/if}

	<!-- ======== Custom Fields ======== -->
	{#if settingsTab === 'custom-fields'}
		<!-- Entity type sub-tabs -->
		<div class="mb-4 flex items-center justify-between">
			<div class="flex gap-2">
				{#each [{ key: 'company', label: 'Company' }, { key: 'contact', label: 'Contact' }, { key: 'opportunity', label: 'Opportunity' }, { key: 'lead', label: 'Lead' }] as et}
					<button
						onclick={() => { cfEntityTab = et.key as typeof cfEntityTab; cfEditingId = null; cfShowAdd = false; }}
						class="rounded-md px-3 py-1.5 text-sm font-medium transition {cfEntityTab === et.key ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'}"
					>
						{et.label}
					</button>
				{/each}
			</div>
			<button
				onclick={installPresets}
				disabled={presetsLoading}
				class="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
			>
				{presetsLoading ? 'Installing...' : 'Install Lending Presets'}
			</button>
		</div>

		{#if cfLoading}
			<p class="text-sm text-surface-500">Loading...</p>
		{:else if cfFields.length === 0 && !cfShowAdd}
			<div class="rounded-lg border border-dashed border-surface-300 p-8 text-center dark:border-surface-700">
				<p class="text-sm text-surface-500">No custom fields for {cfEntityTab} records yet.</p>
				<div class="mt-3 flex justify-center gap-2">
					<button onclick={() => (cfShowAdd = true)} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500">
						Add Field
					</button>
					<button onclick={installPresets} disabled={presetsLoading} class="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
						Install Lending Presets
					</button>
				</div>
			</div>
		{:else}
			<div class="rounded-lg border border-surface-300 dark:border-surface-800">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-surface-300 bg-surface-100 dark:border-surface-800 dark:bg-surface-900">
							<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Order</th>
							<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Label</th>
							<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Type</th>
							<th class="px-4 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Options</th>
							<th class="px-4 py-2 text-center font-medium text-surface-600 dark:text-surface-400">Required</th>
							<th class="px-4 py-2 text-right font-medium text-surface-600 dark:text-surface-400">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each [...cfFields].sort((a, b) => a.position - b.position) as field, i (field.id)}
							<tr class="border-b border-surface-200 dark:border-surface-800">
								{#if cfEditingId === field.id}
									<td class="px-4 py-2 text-surface-500">{i + 1}</td>
									<td class="px-4 py-2">
										<input bind:value={cfEditLabel} class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
									</td>
									<td class="px-4 py-2 text-surface-500 capitalize">{fieldTypes.find((ft) => ft.value === field.fieldType)?.label || field.fieldType}</td>
									<td class="px-4 py-2">
										{#if field.fieldType === 'select' || field.fieldType === 'multi_select'}
											<input bind:value={cfEditOptions} placeholder="opt1, opt2, opt3" class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
										{:else}
											<span class="text-surface-400">&mdash;</span>
										{/if}
									</td>
									<td class="px-4 py-2 text-center">
										<input type="checkbox" bind:checked={cfEditRequired} />
									</td>
									<td class="px-4 py-2 text-right">
										<button onclick={saveCfEdit} class="text-xs text-brand-500 hover:underline">Save</button>
										<button onclick={() => (cfEditingId = null)} class="ml-2 text-xs text-surface-500 hover:underline">Cancel</button>
									</td>
								{:else}
									<td class="px-4 py-2 text-surface-500">
										<div class="flex items-center gap-1">
											<button onclick={() => moveCfField(field.id, 'up')} disabled={i === 0} class="text-surface-400 hover:text-surface-600 disabled:opacity-30">&uarr;</button>
											<button onclick={() => moveCfField(field.id, 'down')} disabled={i === cfFields.length - 1} class="text-surface-400 hover:text-surface-600 disabled:opacity-30">&darr;</button>
										</div>
									</td>
									<td class="px-4 py-2 text-surface-900 dark:text-surface-100">{field.label}</td>
									<td class="px-4 py-2 text-surface-600 dark:text-surface-400">{fieldTypes.find((ft) => ft.value === field.fieldType)?.label || field.fieldType}</td>
									<td class="px-4 py-2 text-xs text-surface-500">
										{#if field.options}
											{@const parsed = (() => { try { return JSON.parse(field.options); } catch { return []; } })()}
											{parsed.join(', ')}
										{:else}
											<span class="text-surface-400">&mdash;</span>
										{/if}
									</td>
									<td class="px-4 py-2 text-center text-surface-600 dark:text-surface-400">{field.required ? 'Yes' : ''}</td>
									<td class="px-4 py-2 text-right">
										<button onclick={() => startCfEdit(field)} class="text-xs text-brand-500 hover:underline">Edit</button>
										<button onclick={() => deleteCfField(field.id)} class="ml-2 text-xs text-red-500 hover:underline">Delete</button>
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if !cfShowAdd}
				<button onclick={() => (cfShowAdd = true)} class="mt-4 rounded-md border border-dashed border-surface-400 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-800">
					+ Add Field
				</button>
			{/if}
		{/if}

		{#if cfShowAdd}
			<div class="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
				<div>
					<label class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Label</label>
					<input bind:value={cfNewLabel} placeholder="e.g. License Type" class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Type</label>
					<select bind:value={cfNewType} class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
						{#each fieldTypes as ft}
							<option value={ft.value}>{ft.label}</option>
						{/each}
					</select>
				</div>
				{#if cfNewType === 'select' || cfNewType === 'multi_select'}
					<div class="min-w-48">
						<label class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Options (comma-separated)</label>
						<input bind:value={cfNewOptions} placeholder="Option 1, Option 2, Option 3" class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
					</div>
				{/if}
				<label class="flex items-center gap-1 text-sm text-surface-700 dark:text-surface-300">
					<input type="checkbox" bind:checked={cfNewRequired} /> Required
				</label>
				<button onclick={addCustomField} disabled={!cfNewLabel.trim()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
					Add Field
				</button>
				<button onclick={() => (cfShowAdd = false)} class="text-sm text-surface-500 hover:text-surface-700">Cancel</button>
			</div>
		{/if}
	{/if}
</div>
