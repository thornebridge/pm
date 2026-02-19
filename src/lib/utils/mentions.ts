const MENTION_REGEX = /@(\w+(?:\s\w+)?)/g;

export function extractMentions(text: string): string[] {
	const matches = text.match(MENTION_REGEX);
	if (!matches) return [];
	return matches.map((m) => m.slice(1).trim());
}

export function renderMentions(text: string): string {
	return text.replace(
		MENTION_REGEX,
		'<span class="font-medium text-brand-600 dark:text-brand-400">$&</span>'
	);
}
