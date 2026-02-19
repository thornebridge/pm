<script lang="ts">
	interface Props {
		name: string;
		size?: 'xs' | 'sm' | 'md' | 'lg';
	}

	let { name, size = 'sm' }: Props = $props();

	const initials = $derived(
		name
			.split(' ')
			.map((p) => p[0])
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);

	// Deterministic color from name
	const colors = [
		'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
		'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
		'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
		'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'
	];

	const colorClass = $derived(() => {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colors[Math.abs(hash) % colors.length];
	});

	const sizeClasses: Record<string, string> = {
		xs: 'h-5 w-5 text-[9px]',
		sm: 'h-6 w-6 text-[10px]',
		md: 'h-8 w-8 text-xs',
		lg: 'h-10 w-10 text-sm'
	};
</script>

<span
	class="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white {colorClass()} {sizeClasses[size]}"
	title={name}
>
	{initials}
</span>
