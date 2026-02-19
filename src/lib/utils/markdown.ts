// Lightweight markdown rendering (subset)
// Supports: **bold**, *italic*, `code`, [links](url), headings, lists (ul/ol), blockquotes, ~~strikethrough~~, images, horizontal rules

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function sanitizeUrl(url: string): string {
	const decoded = url.replace(/&amp;/g, '&');
	if (/^(https?:|mailto:|\/|#)/i.test(decoded)) return url;
	return '';
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
	// Images (before links, since ![alt](url) contains link syntax)
	result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
		const safe = sanitizeUrl(url);
		if (!safe) return alt || '';
		return `<img src="${safe}" alt="${alt}" class="max-w-full rounded-md" />`;
	});
	// Links
	result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
		const safe = sanitizeUrl(url);
		if (!safe) return text;
		return `<a href="${safe}" class="text-brand-600 underline dark:text-brand-400" target="_blank" rel="noopener">${text}</a>`;
	});
	return result;
}

export function renderMarkdown(text: string): string {
	const lines = text.split('\n');
	const html: string[] = [];
	let inList: false | 'ul' | 'ol' = false;
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
		const isUl = /^[-*]\s/.test(line);
		const isOl = /^\d+\.\s/.test(line);
		if (inList && !isUl && !isOl) {
			html.push(inList === 'ul' ? '</ul>' : '</ol>');
			inList = false;
		}

		// Horizontal rules
		if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
			html.push('<hr class="my-2 border-surface-300 dark:border-surface-700" />');
			continue;
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
		const ulMatch = line.match(/^[-*]\s+(.+)/);
		if (ulMatch) {
			if (inList === 'ol') {
				html.push('</ol>');
				inList = false;
			}
			if (!inList) {
				html.push('<ul class="list-disc pl-4 space-y-0.5">');
				inList = 'ul';
			}
			html.push(`<li>${renderInline(ulMatch[1])}</li>`);
			continue;
		}

		// Ordered list items
		const olMatch = line.match(/^\d+\.\s+(.+)/);
		if (olMatch) {
			if (inList === 'ul') {
				html.push('</ul>');
				inList = false;
			}
			if (!inList) {
				html.push('<ol class="list-decimal pl-4 space-y-0.5">');
				inList = 'ol';
			}
			html.push(`<li>${renderInline(olMatch[1])}</li>`);
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

	if (inList) html.push(inList === 'ul' ? '</ul>' : '</ol>');
	if (inCodeBlock) {
		html.push(`<pre class="rounded-md bg-surface-200 p-3 text-xs overflow-x-auto dark:bg-surface-800"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
	}

	return html.join('\n');
}
