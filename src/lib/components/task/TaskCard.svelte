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
	class="block rounded-md border border-slate-800 bg-slate-900 p-3 transition hover:border-slate-700"
	draggable="true"
	ondragstart={ondragstart}
	data-task-id={task.id}
>
	<div class="mb-1 flex items-center gap-2">
		<PriorityIcon priority={task.priority} />
		<span class="text-xs text-slate-500">#{task.number}</span>
	</div>
	<p class="text-sm text-slate-200">{task.title}</p>
	{#if task.labels && task.labels.length > 0}
		<div class="mt-2 flex flex-wrap gap-1">
			{#each task.labels as label}
				<Badge color={label.color}>{label.name}</Badge>
			{/each}
		</div>
	{/if}
</a>
