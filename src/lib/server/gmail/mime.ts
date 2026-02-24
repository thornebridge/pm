/**
 * Build an RFC 2822 MIME message encoded as base64url for the Gmail send API.
 */
export function buildMimeMessage(opts: {
	from: string;
	to: string[];
	cc?: string[];
	subject: string;
	html: string;
	inReplyTo?: string;
	references?: string;
}): string {
	const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
	const lines: string[] = [];

	lines.push(`From: ${opts.from}`);
	lines.push(`To: ${opts.to.join(', ')}`);
	if (opts.cc?.length) lines.push(`Cc: ${opts.cc.join(', ')}`);
	lines.push(`Subject: ${encodeSubject(opts.subject)}`);
	lines.push(`MIME-Version: 1.0`);

	if (opts.inReplyTo) {
		lines.push(`In-Reply-To: ${opts.inReplyTo}`);
		lines.push(`References: ${opts.references || opts.inReplyTo}`);
	}

	lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
	lines.push('');

	// Plain text part (strip HTML tags for fallback)
	const plainText = opts.html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.trim();

	lines.push(`--${boundary}`);
	lines.push('Content-Type: text/plain; charset="UTF-8"');
	lines.push('Content-Transfer-Encoding: 7bit');
	lines.push('');
	lines.push(plainText);

	// HTML part
	lines.push(`--${boundary}`);
	lines.push('Content-Type: text/html; charset="UTF-8"');
	lines.push('Content-Transfer-Encoding: 7bit');
	lines.push('');
	lines.push(opts.html);

	lines.push(`--${boundary}--`);

	const raw = lines.join('\r\n');
	return Buffer.from(raw).toString('base64url');
}

function encodeSubject(subject: string): string {
	// Only encode if the subject contains non-ASCII characters
	if (/^[\x20-\x7E]*$/.test(subject)) return subject;
	return `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
}
