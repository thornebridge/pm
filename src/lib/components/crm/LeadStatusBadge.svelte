<script lang="ts">
	interface Props {
		name: string;
		color: string;
	}

	let { name, color }: Props = $props();
</script>

<span
	class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
	style="background-color: {color}20; color: {color};"
>
	{name}
</span>
