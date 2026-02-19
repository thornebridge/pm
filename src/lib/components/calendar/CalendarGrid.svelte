<script lang="ts">
	import { goto } from '$app/navigation';

	interface Task {
		id: string;
		number: number;
		title: string;
		priority: 'urgent' | 'high' | 'medium' | 'low';
		statusId: string;
		dueDate: number | null;
	}

	interface Props {
		tasks: Task[];
		projectSlug: string;
	}

	let { tasks, projectSlug }: Props = $props();

	let currentYear = $state(new Date().getFullYear());
	let currentMonth = $state(new Date().getMonth());

	const today = new Date();
	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	const monthLabel = $derived(
		new Date(currentYear, currentMonth, 1).toLocaleString('default', {
			month: 'long',
			year: 'numeric'
		})
	);

	const priorityColors: Record<string, string> = {
		urgent: 'bg-red-500/20 text-red-700 dark:text-red-400',
		high: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
		medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
		low: 'bg-surface-500/20 text-surface-700 dark:text-surface-400'
	};

	// Build calendar grid
	const calendarWeeks = $derived.by(() => {
		const firstDay = new Date(currentYear, currentMonth, 1);
		const lastDay = new Date(currentYear, currentMonth + 1, 0);
		const startDayOfWeek = firstDay.getDay(); // 0 = Sun

		const weeks: Array<Array<{ date: number; month: number; year: number; dateStr: string; isCurrentMonth: boolean }>> = [];
		let week: Array<{ date: number; month: number; year: number; dateStr: string; isCurrentMonth: boolean }> = [];

		// Fill leading days from previous month
		const prevMonthLast = new Date(currentYear, currentMonth, 0);
		for (let i = startDayOfWeek - 1; i >= 0; i--) {
			const d = prevMonthLast.getDate() - i;
			const m = currentMonth === 0 ? 11 : currentMonth - 1;
			const y = currentMonth === 0 ? currentYear - 1 : currentYear;
			week.push({
				date: d,
				month: m,
				year: y,
				dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
				isCurrentMonth: false
			});
		}

		// Fill current month days
		for (let d = 1; d <= lastDay.getDate(); d++) {
			week.push({
				date: d,
				month: currentMonth,
				year: currentYear,
				dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
				isCurrentMonth: true
			});
			if (week.length === 7) {
				weeks.push(week);
				week = [];
			}
		}

		// Fill trailing days from next month
		if (week.length > 0) {
			let nextDay = 1;
			const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
			const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
			while (week.length < 7) {
				week.push({
					date: nextDay,
					month: nextM,
					year: nextY,
					dateStr: `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`,
					isCurrentMonth: false
				});
				nextDay++;
			}
			weeks.push(week);
		}

		return weeks;
	});

	// Map tasks by date string
	const tasksByDate = $derived.by(() => {
		const map = new Map<string, Task[]>();
		for (const task of tasks) {
			if (!task.dueDate) continue;
			const d = new Date(task.dueDate);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
			const arr = map.get(key) || [];
			arr.push(task);
			map.set(key, arr);
		}
		return map;
	});

	function prevMonth() {
		if (currentMonth === 0) {
			currentMonth = 11;
			currentYear--;
		} else {
			currentMonth--;
		}
	}

	function nextMonth() {
		if (currentMonth === 11) {
			currentMonth = 0;
			currentYear++;
		} else {
			currentMonth++;
		}
	}

	function goToday() {
		currentYear = today.getFullYear();
		currentMonth = today.getMonth();
	}

	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
</script>

<div class="px-6 pb-4">
	<!-- Navigation -->
	<div class="mb-4 flex items-center gap-3">
		<button
			onclick={prevMonth}
			class="rounded-md border border-surface-300 px-2 py-1 text-xs text-surface-600 transition hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
		>
			&larr; Prev
		</button>
		<button
			onclick={goToday}
			class="rounded-md border border-surface-300 px-2 py-1 text-xs text-surface-600 transition hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
		>
			Today
		</button>
		<button
			onclick={nextMonth}
			class="rounded-md border border-surface-300 px-2 py-1 text-xs text-surface-600 transition hover:bg-surface-100 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
		>
			Next &rarr;
		</button>
		<h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{monthLabel}</h3>
	</div>

	<!-- Calendar grid -->
	<div class="overflow-hidden rounded-lg border border-surface-300 dark:border-surface-800">
		<!-- Day headers -->
		<div class="grid grid-cols-7 border-b border-surface-300 bg-surface-100 dark:border-surface-800 dark:bg-surface-800">
			{#each dayNames as day}
				<div class="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-surface-500">
					{day}
				</div>
			{/each}
		</div>

		<!-- Weeks -->
		{#each calendarWeeks as week}
			<div class="grid grid-cols-7 border-b border-surface-200 last:border-b-0 dark:border-surface-800/50">
				{#each week as cell}
					{@const isToday = cell.dateStr === todayStr}
					{@const cellTasks = tasksByDate.get(cell.dateStr) || []}
					<div
						class="min-h-[100px] border-r border-surface-200 p-1.5 last:border-r-0 dark:border-surface-800/50 {cell.isCurrentMonth ? 'bg-surface-50 dark:bg-surface-900' : 'bg-surface-100/50 dark:bg-surface-900/30'}"
					>
						<div class="mb-1 text-right">
							<span
								class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs {isToday ? 'bg-brand-500 font-bold text-white' : cell.isCurrentMonth ? 'text-surface-700 dark:text-surface-300' : 'text-surface-400 dark:text-surface-600'}"
							>
								{cell.date}
							</span>
						</div>
						<div class="space-y-0.5">
							{#each cellTasks.slice(0, 3) as task (task.id)}
								<button
									onclick={() => goto(`/projects/${projectSlug}/task/${task.number}`)}
									class="block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium transition hover:ring-1 hover:ring-brand-400 {priorityColors[task.priority]}"
									title="#{task.number} {task.title}"
								>
									#{task.number} {task.title}
								</button>
							{/each}
							{#if cellTasks.length > 3}
								<span class="block text-center text-[10px] text-surface-500">
									+{cellTasks.length - 3} more
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/each}
	</div>
</div>
