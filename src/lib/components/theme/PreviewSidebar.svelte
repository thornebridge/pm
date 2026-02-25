<script lang="ts">
	interface Props {
		platformName?: string;
	}
	let { platformName = 'PM' }: Props = $props();
</script>

<div class="pm-sidebar flex h-full w-40 shrink-0 flex-col border-r bg-surface-900 text-surface-100" style="border-color: var(--color-surface-800);">
	<div class="flex h-9 items-center gap-1.5 px-3">
		<span class="inline-flex h-5 w-5 items-center justify-center rounded text-[8px] font-bold text-white" style="background-color: var(--color-brand-500)">{platformName.charAt(0)}</span>
		<span class="text-xs font-semibold">{platformName}</span>
	</div>
	<div class="px-2 pb-1.5" style="border-bottom: 1px solid var(--color-surface-800);">
		<div class="flex gap-0.5">
			<span class="rounded px-1.5 py-0.5 text-[10px] font-medium text-surface-100" style="background-color: var(--color-surface-700);">Ops</span>
			<span class="rounded px-1.5 py-0.5 text-[10px] font-medium text-surface-500">Sales</span>
		</div>
	</div>
	<nav class="flex-1 space-y-0.5 overflow-hidden px-1.5 py-1.5">
		<a href="#preview" class="pm-sidebar-active flex items-center gap-1.5 rounded px-2 py-1 text-[10px] text-surface-100" style="background-color: var(--color-surface-800);">
			<span class="h-3 w-3 rounded bg-surface-600"></span>
			Dashboard
		</a>
		<a href="#preview" class="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] text-surface-400 hover:text-surface-100">
			<span class="h-3 w-3 rounded bg-surface-700"></span>
			My Tasks
		</a>
		<a href="#preview" class="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] text-surface-400 hover:text-surface-100">
			<span class="h-3 w-3 rounded bg-surface-700"></span>
			Projects
		</a>
		<a href="#preview" class="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] text-surface-400 hover:text-surface-100">
			<span class="h-3 w-3 rounded bg-surface-700"></span>
			Activity
		</a>
	</nav>
	<div class="px-3 py-2" style="border-top: 1px solid var(--color-surface-800);">
		<div class="flex items-center gap-1.5">
			<span class="h-5 w-5 rounded-full bg-brand-600"></span>
			<span class="text-[10px] text-surface-400">User</span>
		</div>
	</div>
</div>
