<script lang="ts">
	interface User {
		id: string;
		name: string;
	}

	interface Props {
		users: User[];
		query: string;
		visible: boolean;
		x: number;
		y: number;
		selectedIndex: number;
		onselect: (user: User) => void;
	}

	let { users, query, visible, x, y, selectedIndex, onselect }: Props = $props();

	const filtered = $derived(
		query
			? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
			: users.slice(0, 5)
	);
</script>

{#if visible && filtered.length > 0}
	<div
		class="absolute z-50 w-48 overflow-hidden rounded-md border border-surface-300 bg-surface-50 shadow-lg dark:border-surface-700 dark:bg-surface-900"
		style="left: {x}px; top: {y}px"
	>
		{#each filtered as user, i (user.id)}
			<button
				onclick={() => onselect(user)}
				class="flex w-full items-center px-3 py-1.5 text-left text-sm transition {i === selectedIndex ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800'}"
			>
				{user.name}
			</button>
		{/each}
	</div>
{/if}
