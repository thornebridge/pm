<script lang="ts">
	import PriorityIcon from '$lib/components/task/PriorityIcon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	let { data } = $props();

	let search = $state('');
	let filterStatus = $state('');
	let filterPriority = $state('');
	let sortBy = $state<'number' | 'priority' | 'created'>('number');

	const statusMap = $derived(new Map(data.statuses.map((s) => [s.id, s])));

	const filteredTasks = $derived(() => {
		let result = data.tasks;

		if (search) {
			const q = search.toLowerCase();
			result = result.filter((t) => t.title.toLowerCase().includes(q));
		}
		if (filterStatus) {
			result = result.filter((t) => t.statusId === filterStatus);
		}
		if (filterPriority) {
			result = result.filter((t) => t.priority === filterPriority);
		}

		const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

		if (sortBy === 'priority') {
			result = [...result].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
		} else if (sortBy === 'created') {
			result = [...result].sort((a, b) => b.createdAt - a.createdAt);
		} else {
			result = [...result].sort((a, b) => b.number - a.number);
		}

		return result;
	});
</script>

<svelte:head>
	<title>{data.project.name} - List</title>
</svelte:head>

<div class="p-6">
	<!-- Filters -->
	<div class="mb-4 flex flex-wrap items-center gap-2">
		<input
			bind:value={search}
			placeholder="Search tasks..."
			class="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500"
		/>
		<select
			bind:value={filterStatus}
			class="rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-300"
		>
			<option value="">All statuses</option>
			{#each data.statuses as status}
				<option value={status.id}>{status.name}</option>
			{/each}
		</select>
		<select
			bind:value={filterPriority}
			class="rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-300"
		>
			<option value="">All priorities</option>
			<option value="urgent">Urgent</option>
			<option value="high">High</option>
			<option value="medium">Medium</option>
			<option value="low">Low</option>
		</select>
		<select
			bind:value={sortBy}
			class="rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-300"
		>
			<option value="number">Sort by #</option>
			<option value="priority">Sort by priority</option>
			<option value="created">Sort by created</option>
		</select>
	</div>

	<!-- Table -->
	<div class="overflow-hidden rounded-lg border border-slate-800">
		<table class="w-full">
			<thead>
				<tr class="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
					<th class="px-4 py-2 w-12">#</th>
					<th class="px-4 py-2 w-8"></th>
					<th class="px-4 py-2">Title</th>
					<th class="px-4 py-2 w-28">Status</th>
					<th class="px-4 py-2 w-20">Labels</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredTasks() as task (task.id)}
					<tr class="border-b border-slate-800/50 hover:bg-slate-800/30">
						<td class="px-4 py-2 text-xs text-slate-500">{task.number}</td>
						<td class="px-4 py-2"><PriorityIcon priority={task.priority} /></td>
						<td class="px-4 py-2">
							<a
								href="/projects/{data.project.slug}/task/{task.number}"
								class="text-sm text-slate-200 hover:text-white"
							>
								{task.title}
							</a>
						</td>
						<td class="px-4 py-2">
							{#if statusMap.get(task.statusId)}
								{@const status = statusMap.get(task.statusId)!}
								<span class="flex items-center gap-1.5 text-xs text-slate-400">
									<span class="h-2 w-2 rounded-full" style="background-color: {status.color}"></span>
									{status.name}
								</span>
							{/if}
						</td>
						<td class="px-4 py-2">
							<div class="flex flex-wrap gap-1">
								{#each task.labels as label}
									<Badge color={label.color}>{label.name}</Badge>
								{/each}
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="px-4 py-8 text-center text-sm text-slate-500">No tasks found</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
