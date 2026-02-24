import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { createInvite, listInvites, deleteInvite } from '$lib/server/auth/invite.js';
import { sendEmail } from '$lib/server/notifications/email.js';
import { broadcastAdminChanged } from '$lib/server/ws/handlers.js';

export const GET: RequestHandler = async (event) => {
	requireAdmin(event);
	return json(await listInvites());
};

export const POST: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { email, role } = await event.request.json();

	const invite = await createInvite(user.id, role || 'member', email);

	if (email) {
		const inviteUrl = `${event.url.origin}/invite/${invite.token}`;
		sendEmail(
			email,
			"You're invited to PM",
			`<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
    <div style="padding:24px;">
      <h2 style="margin:0 0 8px;font-size:16px;color:#111;">You've been invited</h2>
      <p style="margin:0;color:#444;font-size:14px;line-height:1.5;">${user.name} invited you to join PM. Click below to create your account.</p>
      <a href="${inviteUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#2d4f3e;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">Accept Invite</a>
      <p style="margin:12px 0 0;color:#999;font-size:12px;">This invite expires in 7 days.</p>
    </div>
    <div style="padding:12px 24px;background:#fafafa;border-top:1px solid #e5e5e5;">
      <p style="margin:0;color:#999;font-size:11px;">PM &mdash; <a href="https://pm.thornebridge.tech" style="color:#999;">pm.thornebridge.tech</a></p>
    </div>
  </div>
</body></html>`
		).catch(() => {});
	}

	broadcastAdminChanged();
	return json(invite, { status: 201 });
};

export const DELETE: RequestHandler = async (event) => {
	requireAdmin(event);
	const { id } = await event.request.json();

	if (!id) {
		return json({ error: 'id is required' }, { status: 400 });
	}

	await deleteInvite(id);
	broadcastAdminChanged();
	return json({ ok: true });
};
