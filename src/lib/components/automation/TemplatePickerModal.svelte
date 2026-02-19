<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';

	interface Template {
		name: string;
		description: string;
		trigger: { event: string; config?: Record<string, unknown> };
		conditions: Array<{ field: string; operator: string; value?: string }>;
		actions: Array<Record<string, unknown>>;
	}

	interface Props {
		open: boolean;
		onclose: () => void;
		onselect: (template: Template) => void;
	}

	let { open, onclose, onselect }: Props = $props();

	const templates: Template[] = [
		{
			name: 'Notify creator when done',
			description: 'When a task status changes to a closed status, notify the creator.',
			trigger: { event: 'task.status_changed' },
			conditions: [],
			actions: [{ type: 'send_notification', target: 'creator', title: 'Task completed: {{task.title}}', body: 'Task #{{task.number}} has been completed.' }]
		},
		{
			name: 'Auto-assign new bugs',
			description: 'When a new task is created with type "bug", set the assignee.',
			trigger: { event: 'task.created' },
			conditions: [{ field: 'type', operator: 'equals', value: 'bug' }],
			actions: [{ type: 'set_field', field: 'assigneeId', value: '' }]
		},
		{
			name: 'Escalate urgent tasks',
			description: 'When priority is changed to urgent, send a notification.',
			trigger: { event: 'task.priority_changed', config: { priority: 'urgent' } },
			conditions: [],
			actions: [{ type: 'send_notification', target: 'assignee', title: 'Urgent: {{task.title}}', body: 'Task #{{task.number}} has been escalated to urgent priority.' }]
		},
		{
			name: 'Label overdue tasks',
			description: 'When a due date is approaching, add an "overdue" label.',
			trigger: { event: 'due_date.approaching', config: { hoursBefore: 1 } },
			conditions: [],
			actions: [{ type: 'add_label', labelId: '' }]
		},
		{
			name: 'Move to review on comment',
			description: 'When a comment is added, change the task status.',
			trigger: { event: 'comment.added' },
			conditions: [],
			actions: [{ type: 'set_field', field: 'statusId', value: '' }]
		},
		{
			name: 'Notify on reassignment',
			description: 'When assignee changes, notify the new assignee.',
			trigger: { event: 'task.assigned' },
			conditions: [],
			actions: [{ type: 'send_notification', target: 'assignee', title: 'Assigned: {{task.title}}', body: 'You have been assigned task #{{task.number}}.' }]
		}
	];
</script>

<Modal {open} {onclose} title="Start from a template">
	<div class="grid grid-cols-2 gap-3">
		{#each templates as template}
			<button
				class="rounded-lg border border-surface-200 p-3 text-left transition hover:border-brand-400 hover:bg-brand-50/50 dark:border-surface-700 dark:hover:border-brand-600 dark:hover:bg-brand-950/30"
				onclick={() => { onselect(template); onclose(); }}
			>
				<div class="text-sm font-medium text-surface-900 dark:text-surface-100">{template.name}</div>
				<div class="mt-1 text-xs text-surface-500 dark:text-surface-400">{template.description}</div>
			</button>
		{/each}
	</div>
</Modal>
