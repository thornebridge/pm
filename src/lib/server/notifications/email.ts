import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

const FROM = 'PM <notifications@thornebridge.tech>';

let resend: Resend | null = null;

function getClient(): Resend | null {
	if (resend) return resend;
	const key = env.RESEND_API_KEY;
	if (!key) return null;
	resend = new Resend(key);
	return resend;
}

export async function sendEmail(to: string, subject: string, html: string) {
	const client = getClient();
	if (!client) return;

	try {
		await client.emails.send({ from: FROM, to, subject, html });
	} catch (err) {
		console.error('[email] Failed to send:', err);
	}
}

export function taskEmailHtml(opts: {
	heading: string;
	body: string;
	taskUrl?: string;
	projectName?: string;
}) {
	const button = opts.taskUrl
		? `<a href="${opts.taskUrl}" style="display:inline-block;margin-top:16px;padding:8px 16px;background:#2d4f3e;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">View Task</a>`
		: '';

	const project = opts.projectName
		? `<p style="margin:4px 0 0;color:#888;font-size:12px;">${escapeHtml(opts.projectName)}</p>`
		: '';

	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
    <div style="padding:24px;">
      <h2 style="margin:0 0 8px;font-size:16px;color:#111;">${escapeHtml(opts.heading)}</h2>
      <p style="margin:0;color:#444;font-size:14px;line-height:1.5;">${escapeHtml(opts.body)}</p>
      ${project}
      ${button}
    </div>
    <div style="padding:12px 24px;background:#fafafa;border-top:1px solid #e5e5e5;">
      <p style="margin:0;color:#999;font-size:11px;">Sent by PM &mdash; <a href="https://pm.thornebridge.tech" style="color:#999;">pm.thornebridge.tech</a></p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
