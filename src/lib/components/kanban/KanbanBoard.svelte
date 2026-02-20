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
		type?: 'task' | 'bug' | 'feature' | 'improvement';
		priority: 'urgent' | 'high' | 'medium' | 'low';
		statusId: string;
		assigneeId?: string | null;
		assigneeName?: string | null;
		dueDate?: number | null;
		labels?: Array<{ name: string; color: string }>;
		checklistTotal?: number;
		checklistDone?: number;
		commentCount?: number;
		subtaskTotal?: number;
		subtaskDone?: number;
		position: number;
		parentId?: string | null;
	}

	interface Props {
		statuses: Status[];
		tasks: Task[];
		projectId: string;
		projectSlug: string;
		sprintId?: string;
		ontaskclick?: (task: Task) => void;
		focusedTaskId?: string | null;
	}

	let { statuses, tasks, projectId, projectSlug, sprintId, ontaskclick, focusedTaskId }: Props = $props();

	let draggedTask: Task | null = $state(null);
	let localTasks = $state<Task[]>([]);

	$effect(() => {
		// Filter out subtasks from board
		localTasks = tasks.filter((t) => !t.parentId);
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
		// Add drag visual
		const el = (e.target as HTMLElement);
		el.classList.add('opacity-50', 'rotate-1', 'scale-[1.02]');
	}

	async function handleDrop(e: DragEvent, targetStatusId: string) {
		if (!draggedTask) return;

		// Remove drag visual from all cards
		document.querySelectorAll('.opacity-50.rotate-1').forEach((el) => {
			el.classList.remove('opacity-50', 'rotate-1', 'scale-[1.02]');
		});

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

<div class="flex flex-1 min-h-0 gap-4 overflow-x-auto px-6 pb-4">
	{#each statuses.sort((a, b) => a.position - b.position) as status (status.id)}
		<KanbanColumn
			{status}
			tasks={tasksByStatus(status.id)}
			{projectId}
			{projectSlug}
			{sprintId}
			ondrop={handleDrop}
			ondragstart={handleDragStart}
			{ontaskclick}
			{focusedTaskId}
		/>
	{/each}
</div>
