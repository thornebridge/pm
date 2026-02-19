// Lightweight markdown rendering (subset)
// Supports: **bold**, *italic*, `code`, [links](url), headings, lists, blockquotes, ~~strikethrough~~

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
	let result = escapeHtml(text);
	// Code spans
	result = result.replace(/`([^`]+)`/g, '<code class="rounded bg-surface-200 px-1 py-0.5 text-xs dark:bg-surface-800">$1</code>');
	// Bold
	result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	// Italic
	result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
	// Strikethrough
	result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');
	// Links
	result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-brand-600 underline dark:text-brand-400" target="_blank" rel="noopener">$1</a>');
	return result;
}

export function renderMarkdown(text: string): string {
	const lines = text.split('\n');
	const html: string[] = [];
	let inList = false;
	let inCodeBlock = false;
	let codeLines: string[] = [];

	for (const line of lines) {
		// Code blocks
		if (line.trim().startsWith('```')) {
			if (inCodeBlock) {
				html.push(`<pre class="rounded-md bg-surface-200 p-3 text-xs overflow-x-auto dark:bg-surface-800"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
				codeLines = [];
				inCodeBlock = false;
			} else {
				inCodeBlock = true;
			}
			continue;
		}
		if (inCodeBlock) {
			codeLines.push(line);
			continue;
		}

		// Close list if needed
		if (inList && !line.match(/^[-*]\s/)) {
			html.push('</ul>');
			inList = false;
		}

		// Headings
		const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
		if (headingMatch) {
			const level = headingMatch[1].length;
			const cls = level === 1 ? 'text-base font-semibold' : level === 2 ? 'text-sm font-semibold' : 'text-sm font-medium';
			html.push(`<h${level} class="${cls} text-surface-900 dark:text-surface-100">${renderInline(headingMatch[2])}</h${level}>`);
			continue;
		}

		// Blockquotes
		if (line.startsWith('> ')) {
			html.push(`<blockquote class="border-l-2 border-surface-300 pl-3 text-surface-600 dark:border-surface-700 dark:text-surface-400">${renderInline(line.slice(2))}</blockquote>`);
			continue;
		}

		// Unordered list items
		const listMatch = line.match(/^[-*]\s+(.+)/);
		if (listMatch) {
			if (!inList) {
				html.push('<ul class="list-disc pl-4 space-y-0.5">');
				inList = true;
			}
			html.push(`<li>${renderInline(listMatch[1])}</li>`);
			continue;
		}

		// Empty line
		if (line.trim() === '') {
			html.push('<br />');
			continue;
		}

		// Regular paragraph
		html.push(`<p>${renderInline(line)}</p>`);
	}

	if (inList) html.push('</ul>');
	if (inCodeBlock) {
		html.push(`<pre class="rounded-md bg-surface-200 p-3 text-xs overflow-x-auto dark:bg-surface-800"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
	}

	return html.join('\n');
}
