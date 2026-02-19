<script lang="ts">
	import { goto } from '$app/navigation';

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
		startDate: number | null;
		dueDate: number | null;
		createdAt: number;
	}

	interface Props {
		tasks: Task[];
		statuses: Status[];
		projectSlug: string;
	}

	let { tasks, statuses, projectSlug }: Props = $props();

	const ROW_HEIGHT = 36;
	const HEADER_HEIGHT = 48;
	const LABEL_WIDTH = 260;
	const DAY_WIDTH = 32;

	const statusMap = $derived(new Map(statuses.map((s) => [s.id, s])));

	// Compute date range from tasks
	const dateRange = $derived.by(() => {
		const now = new Date();
		let minDate = new Date(now.getFullYear(), now.getMonth(), 1);
		let maxDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);

		for (const task of tasks) {
			if (task.startDate) {
				const d = new Date(task.startDate);
				if (d < minDate) minDate = new Date(d.getFullYear(), d.getMonth(), 1);
			}
			if (task.dueDate) {
				const d = new Date(task.dueDate);
				if (d > maxDate) maxDate = new Date(d.getFullYear(), d.getMonth() + 1, 0);
			}
		}

		// Pad by a week on each side
		minDate = new Date(minDate.getTime() - 7 * 86400000);
		maxDate = new Date(maxDate.getTime() + 7 * 86400000);

		return { min: minDate, max: maxDate };
	});

	const totalDays = $derived(Math.ceil((dateRange.max.getTime() - dateRange.min.getTime()) / 86400000));
	const chartWidth = $derived(totalDays * DAY_WIDTH);
	const chartHeight = $derived(HEADER_HEIGHT + tasks.length * ROW_HEIGHT + 20);

	function dayOffset(date: Date): number {
		return Math.floor((date.getTime() - dateRange.min.getTime()) / 86400000);
	}

	// Build month headers
	const months = $derived.by(() => {
		const result: Array<{ label: string; x: number; width: number }> = [];
		const d = new Date(dateRange.min.getFullYear(), dateRange.min.getMonth(), 1);
		while (d <= dateRange.max) {
			const start = Math.max(0, dayOffset(d));
			const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
			const end = Math.min(totalDays, dayOffset(nextMonth));
			result.push({
				label: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
				x: start * DAY_WIDTH,
				width: (end - start) * DAY_WIDTH
			});
			d.setMonth(d.getMonth() + 1);
		}
		return result;
	});

	// Build week lines
	const weekLines = $derived.by(() => {
		const lines: Array<{ x: number; label: string }> = [];
		const d = new Date(dateRange.min);
		// Advance to next Monday
		while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
		while (d <= dateRange.max) {
			const offset = dayOffset(d);
			lines.push({
				x: offset * DAY_WIDTH,
				label: `${d.getMonth() + 1}/${d.getDate()}`
			});
			d.setDate(d.getDate() + 7);
		}
		return lines;
	});

	// Today marker
	const todayX = $derived.by(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const offset = dayOffset(today);
		if (offset >= 0 && offset <= totalDays) {
			return offset * DAY_WIDTH;
		}
		return null;
	});

	// Sorted tasks for display
	const sortedTasks = $derived(
		[...tasks].sort((a, b) => {
			const aStart = a.startDate ?? a.dueDate ?? a.createdAt;
			const bStart = b.startDate ?? b.dueDate ?? b.createdAt;
			return aStart - bStart;
		})
	);

	function handleBarClick(task: Task) {
		goto(`/projects/${projectSlug}/task/${task.number}`);
	}

	let scrollContainer: HTMLDivElement | undefined = $state();

	// Scroll to today on mount
	$effect(() => {
		if (scrollContainer && todayX !== null) {
			scrollContainer.scrollLeft = Math.max(0, todayX - 300);
		}
	});
</script>

<div class="px-6 pb-4">
	<!-- Legend -->
	<div class="mb-3 flex flex-wrap gap-3">
		{#each statuses.sort((a, b) => a.position - b.position) as status (status.id)}
			<span class="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
				<span class="h-2.5 w-2.5 rounded" style="background-color: {status.color}"></span>
				{status.name}
			</span>
		{/each}
	</div>

	<div class="flex overflow-hidden rounded-lg border border-surface-300 dark:border-surface-800">
		<!-- Fixed left column: task labels -->
		<div class="flex-shrink-0 border-r border-surface-300 bg-surface-50 dark:border-surface-800 dark:bg-surface-900" style="width: {LABEL_WIDTH}px">
			<!-- Header spacer -->
			<div class="border-b border-surface-300 px-3 py-2 text-xs font-medium uppercase tracking-wide text-surface-500 dark:border-surface-800" style="height: {HEADER_HEIGHT}px; line-height: {HEADER_HEIGHT - 16}px">
				Task
			</div>
			<!-- Task labels -->
			{#each sortedTasks as task, i (task.id)}
				<button
					onclick={() => handleBarClick(task)}
					class="flex w-full items-center gap-2 border-b border-surface-200 px-3 text-left transition hover:bg-surface-100 dark:border-surface-800/50 dark:hover:bg-surface-800/30"
					style="height: {ROW_HEIGHT}px"
				>
					<span class="text-[10px] text-surface-400">#{task.number}</span>
					<span class="truncate text-xs text-surface-900 dark:text-surface-200">{task.title}</span>
				</button>
			{/each}
		</div>

		<!-- Scrollable chart area -->
		<div bind:this={scrollContainer} class="flex-1 overflow-x-auto bg-surface-50 dark:bg-surface-900/50">
			<svg width={chartWidth} height={chartHeight} class="block">
				<!-- Month headers -->
				{#each months as month}
					<rect
						x={month.x}
						y={0}
						width={month.width}
						height={24}
						class="fill-surface-100 dark:fill-surface-800"
					/>
					<text
						x={month.x + month.width / 2}
						y={16}
						text-anchor="middle"
						class="fill-surface-700 text-[11px] font-medium dark:fill-surface-300"
					>
						{month.label}
					</text>
				{/each}

				<!-- Week labels -->
				{#each weekLines as week}
					<text
						x={week.x + 2}
						y={38}
						class="fill-surface-400 text-[9px] dark:fill-surface-500"
					>
						{week.label}
					</text>
				{/each}

				<!-- Gridlines -->
				{#each weekLines as week}
					<line
						x1={week.x}
						y1={HEADER_HEIGHT}
						x2={week.x}
						y2={chartHeight}
						class="stroke-surface-200 dark:stroke-surface-800"
						stroke-width="1"
					/>
				{/each}

				<!-- Row backgrounds -->
				{#each sortedTasks as _, i}
					{#if i % 2 === 1}
						<rect
							x={0}
							y={HEADER_HEIGHT + i * ROW_HEIGHT}
							width={chartWidth}
							height={ROW_HEIGHT}
							class="fill-surface-100/50 dark:fill-surface-800/20"
						/>
					{/if}
				{/each}

				<!-- Today marker -->
				{#if todayX !== null}
					<line
						x1={todayX}
						y1={HEADER_HEIGHT}
						x2={todayX}
						y2={chartHeight}
						stroke-width="2"
						class="stroke-brand-500"
						stroke-dasharray="4 2"
					/>
				{/if}

				<!-- Task bars -->
				{#each sortedTasks as task, i (task.id)}
					{@const status = statusMap.get(task.statusId)}
					{@const barColor = status?.color ?? '#6b7280'}
					{@const y = HEADER_HEIGHT + i * ROW_HEIGHT + 8}
					{@const barHeight = ROW_HEIGHT - 16}

					{#if task.startDate && task.dueDate}
						{@const x = dayOffset(new Date(task.startDate)) * DAY_WIDTH}
						{@const endX = dayOffset(new Date(task.dueDate)) * DAY_WIDTH + DAY_WIDTH}
						{@const width = Math.max(endX - x, DAY_WIDTH)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<rect
							{x}
							{y}
							{width}
							height={barHeight}
							rx={4}
							fill={barColor}
							class="cursor-pointer opacity-85 transition-opacity hover:opacity-100"
							onclick={() => handleBarClick(task)}
						>
							<title>#{task.number} {task.title}</title>
						</rect>
						{#if width > 60}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<text
								x={x + 6}
								y={y + barHeight / 2 + 4}
								class="pointer-events-none fill-white text-[10px] font-medium"
							>
								#{task.number}
							</text>
						{/if}
					{:else if task.dueDate}
						{@const x = dayOffset(new Date(task.dueDate)) * DAY_WIDTH + DAY_WIDTH / 2}
						{@const barX = x - DAY_WIDTH / 2}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<rect
							x={barX}
							{y}
							width={DAY_WIDTH}
							height={barHeight}
							rx={4}
							fill={barColor}
							class="cursor-pointer opacity-85 transition-opacity hover:opacity-100"
							onclick={() => handleBarClick(task)}
						>
							<title>#{task.number} {task.title} (due date only)</title>
						</rect>
					{:else}
						<!-- No dates: show dot at creation date -->
						{@const x = dayOffset(new Date(task.createdAt)) * DAY_WIDTH + DAY_WIDTH / 2}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<circle
							cx={x}
							cy={y + barHeight / 2}
							r={6}
							fill={barColor}
							class="cursor-pointer opacity-70 transition-opacity hover:opacity-100"
							onclick={() => handleBarClick(task)}
						>
							<title>#{task.number} {task.title} (no dates set)</title>
						</circle>
					{/if}
				{/each}
			</svg>
		</div>
	</div>
</div>
