<script lang="ts">
	import PriorityIcon from './PriorityIcon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		task: {
			id: string;
			number: number;
			title: string;
			priority: 'urgent' | 'high' | 'medium' | 'low';
			assigneeId?: string | null;
			labels?: Array<{ name: string; color: string }>;
		};
		projectSlug: string;
		ondragstart?: (e: DragEvent) => void;
	}

	let { task, projectSlug, ondragstart }: Props = $props();
</script>

<a
	href="/projects/{projectSlug}/task/{task.number}"
	class="block rounded-md border border-surface-300 bg-surface-50 p-3 transition hover:border-surface-400 hover:shadow-sm dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700"
	draggable="true"
	ondragstart={ondragstart}
	data-task-id={task.id}
>
	<div class="mb-1 flex items-center gap-2">
		<PriorityIcon priority={task.priority} />
		<span class="text-xs text-surface-500">#{task.number}</span>
	</div>
	<p class="text-sm text-surface-900 dark:text-surface-200">{task.title}</p>
	{#if task.labels && task.labels.length > 0}
		<div class="mt-2 flex flex-wrap gap-1">
			{#each task.labels as label}
				<Badge color={label.color}>{label.name}</Badge>
			{/each}
		</div>
	{/if}
</a>
