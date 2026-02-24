<script lang="ts">
	import { api } from '$lib/utils/api.js';
	import { showToast } from '$lib/stores/toasts.js';

	let { data } = $props();

	interface Rule {
		id: string;
		name: string;
		description: string | null;
		entityType: string;
		trigger: { event: string; config?: Record<string, unknown> };
		conditions: { logic: string; conditions: { field: string; operator: string; value?: unknown }[] }[] | null;
		actions: Record<string, unknown>[];
		enabled: boolean;
		runCount: number;
		lastRun: number | null;
		errorCount: number;
	}

	let rules = $state<Rule[]>([]);
	let loading = $state(true);
	let showBuilder = $state(false);
	let editingRule = $state<Rule | null>(null);

	// Builder state
	let bName = $state('');
	let bDescription = $state('');
	let bEntityType = $state<'opportunity' | 'contact' | 'company' | 'activity'>('opportunity');
	let bTriggerEvent = $state('opportunity.created');
	let bTriggerConfig = $state<Record<string, unknown>>({});
	let bConditions = $state<{ field: string; operator: string; value: string }[]>([]);
	let bActions = $state<Record<string, unknown>[]>([]);

	// Execution log
	let showLog = $state(false);
	let logRuleId = $state('');
	let logEntries = $state<{ id: string; triggerEvent: string; status: string; actionsRun: { action: string; result: string; error?: string }[]; error: string | null; durationMs: number | null; createdAt: number }[]>([]);

	const triggerOptions = [
		{ value: 'opportunity.created', label: 'Opportunity Created', entity: 'opportunity' },
		{ value: 'opportunity.stage_changed', label: 'Stage Changed', entity: 'opportunity' },
		{ value: 'opportunity.priority_changed', label: 'Priority Changed', entity: 'opportunity' },
		{ value: 'opportunity.owner_changed', label: 'Owner Changed', entity: 'opportunity' },
		{ value: 'opportunity.value_changed', label: 'Deal Value Changed', entity: 'opportunity' },
		{ value: 'opportunity.won', label: 'Deal Won', entity: 'opportunity' },
		{ value: 'opportunity.lost', label: 'Deal Lost', entity: 'opportunity' },
		{ value: 'contact.created', label: 'Contact Created', entity: 'contact' },
		{ value: 'company.created', label: 'Company Created', entity: 'company' },
		{ value: 'activity.logged', label: 'Activity Logged', entity: 'activity' },
		{ value: 'deal.stale', label: 'Deal Goes Stale (polling)', entity: 'opportunity' },
		{ value: 'deal.no_next_step', label: 'Deal Has No Next Step (polling)', entity: 'opportunity' },
		{ value: 'close_date.approaching', label: 'Close Date Approaching (polling)', entity: 'opportunity' }
	];

	const conditionFields = [
		{ value: 'stageId', label: 'Stage' },
		{ value: 'priority', label: 'Priority' },
		{ value: 'ownerId', label: 'Owner' },
		{ value: 'source', label: 'Source' },
		{ value: 'value', label: 'Deal Value' },
		{ value: 'probability', label: 'Probability' },
		{ value: 'nextStep', label: 'Next Step' }
	];

	const conditionOperators = [
		{ value: 'equals', label: 'equals' },
		{ value: 'not_equals', label: 'does not equal' },
		{ value: 'contains', label: 'contains' },
		{ value: 'greater_than', label: 'greater than' },
		{ value: 'less_than', label: 'less than' },
		{ value: 'is_set', label: 'is set' },
		{ value: 'is_not_set', label: 'is not set' }
	];

	const actionTypes = [
		{ value: 'set_field', label: 'Set Field' },
		{ value: 'log_activity', label: 'Log Activity' },
		{ value: 'create_task', label: 'Create Task' },
		{ value: 'send_notification', label: 'Send Notification' },
		{ value: 'fire_webhook', label: 'Fire Webhook' }
	];

	const settableFields = [
		{ value: 'priority', label: 'Priority' },
		{ value: 'ownerId', label: 'Owner' },
		{ value: 'nextStep', label: 'Next Step' },
		{ value: 'source', label: 'Source' }
	];

	async function loadRules() {
		loading = true;
		try {
			rules = await api<Rule[]>('/api/crm/automations');
		} catch {
			rules = [];
		} finally {
			loading = false;
		}
	}

	$effect(() => { loadRules(); });

	function openBuilder(rule?: Rule) {
		if (rule) {
			editingRule = rule;
			bName = rule.name;
			bDescription = rule.description || '';
			bEntityType = rule.entityType as typeof bEntityType;
			bTriggerEvent = rule.trigger.event;
			bTriggerConfig = rule.trigger.config || {};
			bConditions = rule.conditions?.[0]?.conditions?.map((c) => ({
				field: c.field,
				operator: c.operator,
				value: String(c.value ?? '')
			})) || [];
			bActions = [...rule.actions];
		} else {
			editingRule = null;
			bName = '';
			bDescription = '';
			bEntityType = 'opportunity';
			bTriggerEvent = 'opportunity.created';
			bTriggerConfig = {};
			bConditions = [];
			bActions = [];
		}
		showBuilder = true;
	}

	function closeBuilder() {
		showBuilder = false;
		editingRule = null;
	}

	function addCondition() {
		bConditions = [...bConditions, { field: 'priority', operator: 'equals', value: '' }];
	}

	function removeCondition(i: number) {
		bConditions = bConditions.filter((_, idx) => idx !== i);
	}

	function addAction() {
		bActions = [...bActions, { type: 'log_activity', activityType: 'note', subject: '' }];
	}

	function removeAction(i: number) {
		bActions = bActions.filter((_, idx) => idx !== i);
	}

	function updateAction(i: number, key: string, value: unknown) {
		const updated = [...bActions];
		updated[i] = { ...updated[i], [key]: value };
		bActions = updated;
	}

	function changeActionType(i: number, newType: string) {
		const defaults: Record<string, Record<string, unknown>> = {
			set_field: { type: 'set_field', field: 'priority', value: '' },
			log_activity: { type: 'log_activity', activityType: 'note', subject: '' },
			create_task: { type: 'create_task', title: '', daysFromNow: 1, priority: 'medium' },
			send_notification: { type: 'send_notification', target: 'owner', title: '', body: '' },
			fire_webhook: { type: 'fire_webhook', url: '' }
		};
		const updated = [...bActions];
		updated[i] = defaults[newType] || { type: newType };
		bActions = updated;
	}

	async function saveRule() {
		if (!bName.trim()) { showToast('Name is required', 'error'); return; }
		if (bActions.length === 0) { showToast('At least one action is required', 'error'); return; }

		const triggerDef = triggerOptions.find((t) => t.value === bTriggerEvent);
		const payload = {
			name: bName.trim(),
			description: bDescription.trim() || null,
			entityType: triggerDef?.entity || bEntityType,
			trigger: { event: bTriggerEvent, config: Object.keys(bTriggerConfig).length > 0 ? bTriggerConfig : undefined },
			conditions: bConditions.length > 0 ? [{ logic: 'and', conditions: bConditions }] : null,
			actions: bActions,
			enabled: true
		};

		try {
			if (editingRule) {
				await api(`/api/crm/automations/${editingRule.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload)
				});
				showToast('Automation updated');
			} else {
				await api('/api/crm/automations', {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				showToast('Automation created');
			}
			closeBuilder();
			await loadRules();
		} catch (e) {
			showToast(e instanceof Error ? e.message : 'Failed to save', 'error');
		}
	}

	async function toggleRule(rule: Rule) {
		try {
			await api(`/api/crm/automations/${rule.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ enabled: !rule.enabled })
			});
			rules = rules.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r);
		} catch {
			showToast('Failed to toggle automation', 'error');
		}
	}

	async function deleteRule(rule: Rule) {
		if (!confirm(`Delete automation "${rule.name}"?`)) return;
		try {
			await api(`/api/crm/automations/${rule.id}`, { method: 'DELETE' });
			rules = rules.filter((r) => r.id !== rule.id);
			showToast('Automation deleted');
		} catch {
			showToast('Failed to delete', 'error');
		}
	}

	async function viewLog(rule: Rule) {
		logRuleId = rule.id;
		try {
			const data: { executions?: typeof logEntries } = await api(`/api/crm/automations/${rule.id}`);
			logEntries = data.executions || [];
		} catch {
			logEntries = [];
		}
		showLog = true;
	}

	function relativeTime(ts: number) {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		return `${days}d ago`;
	}

	function triggerLabel(event: string) {
		return triggerOptions.find((t) => t.value === event)?.label || event;
	}

	// ─── Pre-built templates ────────────────────────────────────────
	const templates = [
		{
			name: 'Stale Deal Alert',
			description: 'Notify owner when no activity for 5 days',
			trigger: { event: 'deal.stale', config: { staleDays: 5 } },
			entityType: 'opportunity',
			conditions: null,
			actions: [
				{ type: 'send_notification', target: 'owner', title: 'Stale deal: {{opp.title}}', body: 'No activity in 5 days on {{opp.title}} at {{company.name}}. Time to follow up!' },
				{ type: 'create_task', title: 'Follow up on {{opp.title}}', daysFromNow: 0, priority: 'high' }
			]
		},
		{
			name: 'Deal Won Celebration',
			description: 'Log activity and notify when a deal is won',
			trigger: { event: 'opportunity.won' },
			entityType: 'opportunity',
			conditions: null,
			actions: [
				{ type: 'log_activity', activityType: 'note', subject: 'Deal won: {{opp.title}} at {{company.name}}' },
				{ type: 'create_task', title: 'Schedule onboarding kickoff for {{company.name}}', daysFromNow: 1, priority: 'high' }
			]
		},
		{
			name: 'Missing Next Step',
			description: 'Create a task when a deal has no next step',
			trigger: { event: 'deal.no_next_step' },
			entityType: 'opportunity',
			conditions: null,
			actions: [
				{ type: 'send_notification', target: 'owner', title: 'No next step: {{opp.title}}', body: 'Deal {{opp.title}} has no next step defined. Set one to keep momentum.' },
				{ type: 'create_task', title: 'Define next step for {{opp.title}}', daysFromNow: 0, priority: 'medium' }
			]
		},
		{
			name: 'Close Date Approaching',
			description: 'Alert owner 7 days before expected close',
			trigger: { event: 'close_date.approaching', config: { daysBefore: 7 } },
			entityType: 'opportunity',
			conditions: null,
			actions: [
				{ type: 'send_notification', target: 'owner', title: 'Close date approaching: {{opp.title}}', body: 'Deal {{opp.title}} at {{company.name}} is expected to close within 7 days.' }
			]
		},
		{
			name: 'New Deal Onboarding',
			description: 'Auto-create follow-up task when a new deal is created',
			trigger: { event: 'opportunity.created' },
			entityType: 'opportunity',
			conditions: null,
			actions: [
				{ type: 'create_task', title: 'Initial discovery call for {{opp.title}}', daysFromNow: 1, priority: 'high' },
				{ type: 'log_activity', activityType: 'note', subject: 'New deal created: {{opp.title}} at {{company.name}}' }
			]
		}
	];

	async function installTemplate(tpl: typeof templates[0]) {
		try {
			await api('/api/crm/automations', {
				method: 'POST',
				body: JSON.stringify({
					name: tpl.name,
					description: tpl.description,
					entityType: tpl.entityType,
					trigger: tpl.trigger,
					conditions: tpl.conditions,
					actions: tpl.actions,
					enabled: true
				})
			});
			showToast(`Installed: ${tpl.name}`);
			await loadRules();
		} catch (e) {
			showToast(e instanceof Error ? e.message : 'Failed to install template', 'error');
		}
	}
</script>

<svelte:head>
	<title>CRM Automations</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">CRM Automations</h1>
			<p class="text-sm text-surface-500">Automate deal follow-ups, notifications, and workflow tasks.</p>
		</div>
		<button onclick={() => openBuilder()} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500">
			New Automation
		</button>
	</div>

	{#if loading}
		<p class="text-sm text-surface-500">Loading...</p>
	{:else if rules.length === 0}
		<!-- Empty state with templates -->
		<div class="rounded-lg border border-dashed border-surface-300 p-8 text-center dark:border-surface-700">
			<p class="text-sm text-surface-500">No automations configured yet.</p>
			<p class="mt-1 text-xs text-surface-400">Start with a template or create your own.</p>
		</div>

		<h2 class="mt-6 mb-3 text-sm font-semibold text-surface-700 dark:text-surface-300">Quick-Start Templates</h2>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each templates as tpl}
				<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
					<h3 class="text-sm font-medium text-surface-900 dark:text-surface-100">{tpl.name}</h3>
					<p class="mt-1 text-xs text-surface-500">{tpl.description}</p>
					<div class="mt-2 flex items-center gap-2">
						<span class="rounded bg-surface-200 px-1.5 py-0.5 text-[10px] text-surface-600 dark:bg-surface-800 dark:text-surface-400">
							{triggerLabel(tpl.trigger.event)}
						</span>
						<span class="text-[10px] text-surface-400">{tpl.actions.length} action{tpl.actions.length !== 1 ? 's' : ''}</span>
					</div>
					<button onclick={() => installTemplate(tpl)} class="mt-3 text-xs font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">
						Install
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Rules list -->
		<div class="space-y-3">
			{#each rules as rule (rule.id)}
				<div class="rounded-lg border border-surface-300 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900 {!rule.enabled ? 'opacity-60' : ''}">
					<div class="flex items-start justify-between">
						<div>
							<div class="flex items-center gap-2">
								<h3 class="text-sm font-medium text-surface-900 dark:text-surface-100">{rule.name}</h3>
								<span class="rounded bg-surface-200 px-1.5 py-0.5 text-[10px] text-surface-600 dark:bg-surface-800 dark:text-surface-400">
									{triggerLabel(rule.trigger.event)}
								</span>
								{#if !rule.enabled}
									<span class="rounded bg-surface-200 px-1.5 py-0.5 text-[10px] text-surface-500 dark:bg-surface-800">Disabled</span>
								{/if}
							</div>
							{#if rule.description}
								<p class="mt-0.5 text-xs text-surface-500">{rule.description}</p>
							{/if}
							<div class="mt-1.5 flex items-center gap-3 text-[10px] text-surface-400">
								<span>{rule.runCount} run{rule.runCount !== 1 ? 's' : ''}</span>
								{#if rule.lastRun}
									<span>Last: {relativeTime(rule.lastRun)}</span>
								{/if}
								{#if rule.errorCount > 0}
									<span class="text-red-500">{rule.errorCount} error{rule.errorCount !== 1 ? 's' : ''}</span>
								{/if}
							</div>
						</div>
						<div class="flex items-center gap-2">
							<button onclick={() => viewLog(rule)} class="text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300" title="View log">Log</button>
							<button onclick={() => toggleRule(rule)} class="text-xs {rule.enabled ? 'text-amber-500' : 'text-green-500'} hover:underline">
								{rule.enabled ? 'Disable' : 'Enable'}
							</button>
							<button onclick={() => openBuilder(rule)} class="text-xs text-brand-500 hover:underline">Edit</button>
							<button onclick={() => deleteRule(rule)} class="text-xs text-red-500 hover:underline">Delete</button>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Templates section -->
		<details class="mt-6">
			<summary class="cursor-pointer text-sm font-medium text-surface-600 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200">
				Quick-Start Templates
			</summary>
			<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each templates as tpl}
					<div class="rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-900">
						<h3 class="text-sm font-medium text-surface-900 dark:text-surface-100">{tpl.name}</h3>
						<p class="mt-0.5 text-xs text-surface-500">{tpl.description}</p>
						<button onclick={() => installTemplate(tpl)} class="mt-2 text-xs font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">
							Install
						</button>
					</div>
				{/each}
			</div>
		</details>
	{/if}
</div>

<!-- ===== Builder Modal ===== -->
{#if showBuilder}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-16 overflow-y-auto" onclick={(e) => { if (e.target === e.currentTarget) closeBuilder(); }}>
		<div class="w-full max-w-2xl rounded-lg border border-surface-300 bg-white p-6 shadow-xl dark:border-surface-700 dark:bg-surface-900 mb-16">
			<h2 class="mb-4 text-base font-semibold text-surface-900 dark:text-surface-100">
				{editingRule ? 'Edit' : 'New'} Automation
			</h2>

			<!-- Name & Description -->
			<div class="mb-4 space-y-3">
				<div>
					<label class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Name</label>
					<input bind:value={bName} placeholder="e.g. Stale Deal Alert" class="w-full rounded border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400">Description (optional)</label>
					<input bind:value={bDescription} placeholder="What does this automation do?" class="w-full rounded border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
				</div>
			</div>

			<!-- WHEN (Trigger) -->
			<div class="mb-4 rounded-lg border border-surface-200 p-3 dark:border-surface-700">
				<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">When</h3>
				<select bind:value={bTriggerEvent} class="w-full rounded border border-surface-300 bg-surface-50 px-3 py-1.5 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
					{#each triggerOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>

				{#if bTriggerEvent === 'opportunity.stage_changed'}
					<div class="mt-2">
						<label class="mb-1 block text-xs text-surface-500">Filter to stage (optional)</label>
						<select
							value={bTriggerConfig.stageId ?? ''}
							onchange={(e) => { bTriggerConfig = { ...bTriggerConfig, stageId: (e.target as HTMLSelectElement).value || undefined }; }}
							class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						>
							<option value="">Any stage</option>
							{#each data.stages as stage}
								<option value={stage.id}>{stage.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				{#if bTriggerEvent === 'activity.logged'}
					<div class="mt-2">
						<label class="mb-1 block text-xs text-surface-500">Activity type (optional)</label>
						<select
							value={bTriggerConfig.activityType ?? ''}
							onchange={(e) => { bTriggerConfig = { ...bTriggerConfig, activityType: (e.target as HTMLSelectElement).value || undefined }; }}
							class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						>
							<option value="">Any type</option>
							<option value="call">Call</option>
							<option value="email">Email</option>
							<option value="meeting">Meeting</option>
							<option value="note">Note</option>
						</select>
					</div>
				{/if}

				{#if bTriggerEvent === 'deal.stale'}
					<div class="mt-2">
						<label class="mb-1 block text-xs text-surface-500">Days without activity</label>
						<input
							type="number"
							min="1"
							value={bTriggerConfig.staleDays ?? 7}
							onchange={(e) => { bTriggerConfig = { ...bTriggerConfig, staleDays: parseInt((e.target as HTMLInputElement).value) || 7 }; }}
							class="w-24 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						/>
					</div>
				{/if}

				{#if bTriggerEvent === 'close_date.approaching'}
					<div class="mt-2">
						<label class="mb-1 block text-xs text-surface-500">Days before close date</label>
						<input
							type="number"
							min="1"
							value={bTriggerConfig.daysBefore ?? 7}
							onchange={(e) => { bTriggerConfig = { ...bTriggerConfig, daysBefore: parseInt((e.target as HTMLInputElement).value) || 7 }; }}
							class="w-24 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
						/>
					</div>
				{/if}
			</div>

			<!-- IF (Conditions - optional) -->
			<div class="mb-4 rounded-lg border border-surface-200 p-3 dark:border-surface-700">
				<div class="mb-2 flex items-center justify-between">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-surface-500">If (optional)</h3>
					<button onclick={addCondition} class="text-xs text-brand-500 hover:underline">+ Add Condition</button>
				</div>
				{#if bConditions.length === 0}
					<p class="text-xs text-surface-400">No conditions - will run for all matching events.</p>
				{:else}
					<div class="space-y-2">
						{#each bConditions as cond, i}
							<div class="flex items-center gap-2">
								<select bind:value={cond.field} class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
									{#each conditionFields as cf}
										<option value={cf.value}>{cf.label}</option>
									{/each}
								</select>
								<select bind:value={cond.operator} class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
									{#each conditionOperators as op}
										<option value={op.value}>{op.label}</option>
									{/each}
								</select>
								{#if cond.operator !== 'is_set' && cond.operator !== 'is_not_set'}
									{#if cond.field === 'stageId'}
										<select bind:value={cond.value} class="flex-1 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
											{#each data.stages as stage}
												<option value={stage.id}>{stage.name}</option>
											{/each}
										</select>
									{:else if cond.field === 'priority'}
										<select bind:value={cond.value} class="flex-1 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
											<option value="hot">Hot</option>
											<option value="warm">Warm</option>
											<option value="cold">Cold</option>
										</select>
									{:else if cond.field === 'ownerId'}
										<select bind:value={cond.value} class="flex-1 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100">
											{#each data.members as m}
												<option value={m.id}>{m.name}</option>
											{/each}
										</select>
									{:else}
										<input bind:value={cond.value} placeholder="Value" class="flex-1 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100" />
									{/if}
								{/if}
								<button onclick={() => removeCondition(i)} class="text-xs text-red-500 hover:underline">Remove</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- THEN (Actions) -->
			<div class="mb-4 rounded-lg border border-surface-200 p-3 dark:border-surface-700">
				<div class="mb-2 flex items-center justify-between">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-surface-500">Then</h3>
					<button onclick={addAction} class="text-xs text-brand-500 hover:underline">+ Add Action</button>
				</div>
				{#if bActions.length === 0}
					<p class="text-xs text-surface-400">Add at least one action.</p>
				{:else}
					<div class="space-y-3">
						{#each bActions as action, i}
							<div class="rounded border border-surface-200 bg-surface-50/50 p-2 dark:border-surface-700 dark:bg-surface-800/50">
								<div class="mb-2 flex items-center justify-between">
									<select
										value={action.type}
										onchange={(e) => changeActionType(i, (e.target as HTMLSelectElement).value)}
										class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs font-medium dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
									>
										{#each actionTypes as at}
											<option value={at.value}>{at.label}</option>
										{/each}
									</select>
									<button onclick={() => removeAction(i)} class="text-xs text-red-500 hover:underline">Remove</button>
								</div>

								{#if action.type === 'set_field'}
									<div class="flex gap-2">
										<select
											value={action.field}
											onchange={(e) => updateAction(i, 'field', (e.target as HTMLSelectElement).value)}
											class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
										>
											{#each settableFields as sf}
												<option value={sf.value}>{sf.label}</option>
											{/each}
										</select>
										{#if action.field === 'priority'}
											<select
												value={action.value}
												onchange={(e) => updateAction(i, 'value', (e.target as HTMLSelectElement).value)}
												class="flex-1 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
											>
												<option value="hot">Hot</option>
												<option value="warm">Warm</option>
												<option value="cold">Cold</option>
											</select>
										{:else if action.field === 'ownerId'}
											<select
												value={action.value}
												onchange={(e) => updateAction(i, 'value', (e.target as HTMLSelectElement).value)}
												class="flex-1 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
											>
												{#each data.members as m}
													<option value={m.id}>{m.name}</option>
												{/each}
											</select>
										{:else}
											<input
												value={action.value ?? ''}
												oninput={(e) => updateAction(i, 'value', (e.target as HTMLInputElement).value)}
												placeholder="Value"
												class="flex-1 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
											/>
										{/if}
									</div>
								{/if}

								{#if action.type === 'log_activity'}
									<div class="space-y-2">
										<select
											value={action.activityType}
											onchange={(e) => updateAction(i, 'activityType', (e.target as HTMLSelectElement).value)}
											class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
										>
											<option value="note">Note</option>
											<option value="call">Call</option>
											<option value="email">Email</option>
											<option value="meeting">Meeting</option>
										</select>
										<input
											value={action.subject ?? ''}
											oninput={(e) => updateAction(i, 'subject', (e.target as HTMLInputElement).value)}
											placeholder="Subject (use &#123;&#123;opp.title&#125;&#125;, &#123;&#123;company.name&#125;&#125;)"
											class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
										/>
									</div>
								{/if}

								{#if action.type === 'create_task'}
									<div class="space-y-2">
										<input
											value={action.title ?? ''}
											oninput={(e) => updateAction(i, 'title', (e.target as HTMLInputElement).value)}
											placeholder="Task title (use &#123;&#123;opp.title&#125;&#125;, &#123;&#123;company.name&#125;&#125;)"
											class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
										/>
										<div class="flex gap-2">
											<div>
												<label class="block text-[10px] text-surface-500">Due in (days)</label>
												<input
													type="number"
													min="0"
													value={action.daysFromNow ?? 1}
													oninput={(e) => updateAction(i, 'daysFromNow', parseInt((e.target as HTMLInputElement).value) || 0)}
													class="w-20 rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
												/>
											</div>
											<div>
												<label class="block text-[10px] text-surface-500">Priority</label>
												<select
													value={action.priority}
													onchange={(e) => updateAction(i, 'priority', (e.target as HTMLSelectElement).value)}
													class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
												>
													<option value="low">Low</option>
													<option value="medium">Medium</option>
													<option value="high">High</option>
													<option value="urgent">Urgent</option>
												</select>
											</div>
										</div>
									</div>
								{/if}

								{#if action.type === 'send_notification'}
									<div class="space-y-2">
										<select
											value={action.target}
											onchange={(e) => updateAction(i, 'target', (e.target as HTMLSelectElement).value)}
											class="rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
										>
											<option value="owner">Deal Owner</option>
											{#each data.members as m}
												<option value={m.id}>{m.name}</option>
											{/each}
										</select>
										<input
											value={action.title ?? ''}
											oninput={(e) => updateAction(i, 'title', (e.target as HTMLInputElement).value)}
											placeholder="Notification title"
											class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
										/>
										<input
											value={action.body ?? ''}
											oninput={(e) => updateAction(i, 'body', (e.target as HTMLInputElement).value)}
											placeholder="Notification body"
											class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
										/>
									</div>
								{/if}

								{#if action.type === 'fire_webhook'}
									<div class="space-y-2">
										<input
											value={action.url ?? ''}
											oninput={(e) => updateAction(i, 'url', (e.target as HTMLInputElement).value)}
											placeholder="https://example.com/webhook"
											class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
										/>
										<input
											value={action.secret ?? ''}
											oninput={(e) => updateAction(i, 'secret', (e.target as HTMLInputElement).value)}
											placeholder="HMAC secret (optional)"
											class="w-full rounded border border-surface-300 bg-surface-50 px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
										/>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex justify-end gap-2">
				<button onclick={closeBuilder} class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800">
					Cancel
				</button>
				<button onclick={saveRule} disabled={!bName.trim() || bActions.length === 0} class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50">
					{editingRule ? 'Update' : 'Create'} Automation
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ===== Execution Log Modal ===== -->
{#if showLog}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-16 overflow-y-auto" onclick={(e) => { if (e.target === e.currentTarget) showLog = false; }}>
		<div class="w-full max-w-xl rounded-lg border border-surface-300 bg-white p-6 shadow-xl dark:border-surface-700 dark:bg-surface-900 mb-16">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Execution Log</h2>
				<button onclick={() => (showLog = false)} class="text-sm text-surface-500 hover:text-surface-700">&times;</button>
			</div>

			{#if logEntries.length === 0}
				<p class="text-sm text-surface-500">No executions recorded yet.</p>
			{:else}
				<div class="max-h-96 space-y-2 overflow-y-auto">
					{#each logEntries as entry (entry.id)}
						<div class="rounded border border-surface-200 p-2 dark:border-surface-700">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="h-2 w-2 rounded-full {entry.status === 'success' ? 'bg-green-500' : entry.status === 'error' ? 'bg-red-500' : 'bg-surface-400'}"></span>
									<span class="text-xs font-medium text-surface-900 dark:text-surface-100">{entry.triggerEvent}</span>
								</div>
								<span class="text-[10px] text-surface-400">{relativeTime(entry.createdAt)}</span>
							</div>
							{#if entry.actionsRun.length > 0}
								<div class="mt-1 space-y-0.5">
									{#each entry.actionsRun as ar}
										<p class="text-[10px] text-surface-500">
											{ar.action}: {ar.result}
											{#if ar.error}<span class="text-red-500"> ({ar.error})</span>{/if}
										</p>
									{/each}
								</div>
							{/if}
							{#if entry.error}
								<p class="mt-1 text-[10px] text-red-500">{entry.error}</p>
							{/if}
							{#if entry.durationMs != null}
								<p class="mt-0.5 text-[10px] text-surface-400">{entry.durationMs}ms</p>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
