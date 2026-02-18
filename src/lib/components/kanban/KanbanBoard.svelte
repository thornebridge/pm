<script lang="ts">
	import KanbanColumn from './KanbanColumn.svelte';
	import { showToast } from '$lib/stores/toasts.js';
	import { api } from '$lib/utils/api.js';
	import { invalidateAll } from '$app/navigation';

	interface Status {
		id: string;
		name: string;
		color: string;
		position: number;
	}

	interface Task {
		id: string;
		number: number;
		title: string;
		priority: 'urgent' | 'high' | 'medium' | 'low';
		statusId: string;
		assigneeId?: string | null;
		labels?: Array<{ name: string; color: string }>;
		position: number;
	}

	interface Props {
		statuses: Status[];
		tasks: Task[];
		projectId: string;
		projectSlug: string;
	}

	let { statuses, tasks, projectId, projectSlug }: Props = $props();

	let draggedTask: Task | null = $state(null);
	let localTasks = $state<Task[]>([]);

	$effect(() => {
		localTasks = [...tasks];
	});

	function tasksByStatus(statusId: string) {
		return localTasks
			.filter((t) => t.statusId === statusId)
			.sort((a, b) => a.position - b.position);
	}

	function handleDragStart(e: DragEvent, task: Task) {
		draggedTask = task;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', task.id);
		}
	}

	async function handleDrop(e: DragEvent, targetStatusId: string) {
		if (!draggedTask) return;

		const task = draggedTask;
		draggedTask = null;

		if (task.statusId === targetStatusId) return;

		// Optimistic update
		const tasksInTarget = tasksByStatus(targetStatusId);
		const newPosition = tasksInTarget.length > 0 ? tasksInTarget[tasksInTarget.length - 1].position + 1 : 1;

		localTasks = localTasks.map((t) =>
			t.id === task.id ? { ...t, statusId: targetStatusId, position: newPosition } : t
		);

		try {
			await api(`/api/projects/${projectId}/tasks/${task.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ statusId: targetStatusId, position: newPosition })
			});
		} catch (err) {
			showToast('Failed to move task', 'error');
			await invalidateAll();
		}
	}
</script>

<div class="flex gap-4 overflow-x-auto px-6 pb-4">
	{#each statuses.sort((a, b) => a.position - b.position) as status (status.id)}
		<KanbanColumn
			{status}
			tasks={tasksByStatus(status.id)}
			{projectSlug}
			ondrop={handleDrop}
			ondragstart={handleDragStart}
		/>
	{/each}
</div>
