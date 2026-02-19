<script lang="ts">
	import AutomationCard from '$lib/components/automation/AutomationCard.svelte';
	import AutomationBuilder from '$lib/components/automation/AutomationBuilder.svelte';
	import TemplatePickerModal from '$lib/components/automation/TemplatePickerModal.svelte';
	import ExecutionLog from '$lib/components/automation/ExecutionLog.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { api } from '$lib/utils/api.js';

	let { data } = $props();

	let automations = $state(data.automations);
	let builderOpen = $state(false);
	let templatePickerOpen = $state(false);
	let editingRule = $state<typeof automations[0] | null>(null);
	let executionLogOpen = $state(false);
	let executionLogRuleId = $state('');
	let executions = $state<Array<{ id: string; triggerEvent: string; status: string; actionsRun: Array<{ action: string; result: string; error?: string }>; error: string | null; durationMs: number | null; createdAt: number }>>([]);

	const projectId = $derived(data.project.id);
	const apiBase = $derived(`/api/projects/${projectId}/automations`);

	$effect(() => {
		automations = data.automations;
	});

	async function handleSave(ruleData: {
		id?: string;
		name: string;
		description: string;
		trigger: { event: string; config?: Record<string, unknown> };
		conditions: Array<{ field: string; operator: string; value?: string | string[] }>;
		actions: Array<Record<string, unknown>>;
		enabled: boolean;
	}) {
		const payload = {
			name: ruleData.name,
			description: ruleData.description,
			trigger: ruleData.trigger,
			conditions: ruleData.conditions.length > 0
				? [{ logic: 'and', conditions: ruleData.conditions }]
				: null,
			actions: ruleData.actions,
			enabled: ruleData.enabled
		};

		if (ruleData.id) {
			const updated = await api<typeof automations[0]>(`${apiBase}/${ruleData.id}`, {
				method: 'PATCH',
				body: JSON.stringify(payload)
			});
			automations = automations.map((a) => a.id === ruleData.id ? { ...a, ...updated, runCount: a.runCount, lastRun: a.lastRun, errorCount: a.errorCount } : a);
		} else {
			const created = await api<typeof automations[0]>(apiBase, {
				method: 'POST',
				body: JSON.stringify(payload)
			});
			automations = [{ ...created, runCount: 0, lastRun: null, errorCount: 0 }, ...automations];
		}
	}

	async function handleToggle(id: string, enabled: boolean) {
		await api(`${apiBase}/${id}`, {
			method: 'PATCH',
			body: JSON.stringify({ enabled })
		});
		automations = automations.map((a) => a.id === id ? { ...a, enabled } : a);
	}

	async function handleDelete(id: string) {
		if (!confirm('Delete this automation? This cannot be undone.')) return;
		await api(`${apiBase}/${id}`, { method: 'DELETE' });
		automations = automations.filter((a) => a.id !== id);
	}

	function handleEdit(automation: typeof automations[0]) {
		editingRule = automation;
		builderOpen = true;
	}

	async function handleViewLog(ruleId: string) {
		executionLogRuleId = ruleId;
		const detail = await api<{ executions: typeof executions }>(`${apiBase}/${ruleId}`);
		executions = detail.executions;
		executionLogOpen = true;
	}

	function handleTemplateSelect(template: {
		name: string;
		trigger: { event: string; config?: Record<string, unknown> };
		conditions: Array<{ field: string; operator: string; value?: string }>;
		actions: Array<Record<string, unknown>>;
	}) {
		editingRule = {
			name: template.name,
			description: '',
			trigger: template.trigger,
			conditions: template.conditions.length > 0
				? [{ logic: 'and' as const, conditions: template.conditions }]
				: null,
			actions: template.actions,
			enabled: true
		} as typeof automations[0];
		builderOpen = true;
	}

	function openNew() {
		editingRule = null;
		builderOpen = true;
	}
</script>

<div class="mx-auto max-w-4xl p-6">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Automations</h2>
			<p class="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
				Automate repetitive tasks with trigger &rarr; condition &rarr; action rules.
			</p>
		</div>
		<div class="flex gap-2">
			<Button variant="secondary" size="sm" onclick={() => (templatePickerOpen = true)}>Templates</Button>
			<Button size="sm" onclick={openNew}>New Automation</Button>
		</div>
	</div>

	{#if automations.length === 0}
		<EmptyState title="No automations yet" description="Create your first automation or start from a template.">
			{#snippet children()}
				<div class="flex justify-center gap-2">
					<Button variant="secondary" size="sm" onclick={() => (templatePickerOpen = true)}>Browse Templates</Button>
					<Button size="sm" onclick={openNew}>Create Automation</Button>
				</div>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="grid gap-3">
			{#each automations as automation (automation.id)}
				<AutomationCard
					{automation}
					ontoggle={handleToggle}
					onedit={handleEdit}
					ondelete={handleDelete}
					onviewlog={handleViewLog}
				/>
			{/each}
		</div>
	{/if}
</div>

<!-- Builder Modal -->
<AutomationBuilder
	open={builderOpen}
	onclose={() => { builderOpen = false; editingRule = null; }}
	onsave={handleSave}
	initial={editingRule}
	statuses={data.statuses}
	members={data.members}
	labels={data.labels}
/>

<!-- Template Picker -->
<TemplatePickerModal
	open={templatePickerOpen}
	onclose={() => (templatePickerOpen = false)}
	onselect={handleTemplateSelect}
/>

<!-- Execution Log Modal -->
<Modal open={executionLogOpen} onclose={() => (executionLogOpen = false)} title="Execution Log">
	<ExecutionLog {executions} />
</Modal>
