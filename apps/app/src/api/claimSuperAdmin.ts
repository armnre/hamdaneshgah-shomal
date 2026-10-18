import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { audit } from '../lib/server';
import { canBootstrap, bootstrapWinner } from '../lib/policy';

const MESSAGES = {
  closed: 'مدیر سامانه قبلاً تعیین شده است.',
  not_configured: 'راه‌اندازی مدیر کل غیرفعال است؛ ابتدا ایمیل مجاز در تنظیمات سامانه (Secret) تعریف شود.',
  not_allowed: 'این حساب برای راه‌اندازی مدیر کل مجاز نیست.',
};

// One-time bootstrap: only while no admin exists AND only for an email listed in
// the ZITE_BOOTSTRAP_ADMIN_EMAILS secret (comma-separated). Without the secret it is closed.
export default createEndpoint({
  description: 'Makes an allowlisted signed-in user Super Admin when no admin exists yet',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ context }) => {
    const existing = await zite.adminMembers.findAll({ limit: 1 });
    const verdict = canBootstrap(context.user.email, process.env.ZITE_BOOTSTRAP_ADMIN_EMAILS, existing.records.length);
    if (!verdict.ok) {
      throw new ZiteError({ code: 'FORBIDDEN', message: `bootstrap ${verdict.reason}`, userFacingMessage: MESSAGES[verdict.reason as keyof typeof MESSAGES] });
    }
    // Upsert on member so a double-click cannot create two rows for the same user
    const { records } = await zite.adminMembers.bulkCreate({
      records: [{ label: context.user.email, member: context.user.id, role: 'Super Admin', association: null, active: true }],
      matchOn: ['member'],
    });
    // Race guard: if two allowlisted users claimed at the same moment, both rows exist now.
    // Wait briefly so concurrent inserts are visible, then every claimant agrees on one winner;
    // losers remove their own row.
    await new Promise((r) => setTimeout(r, 400));
    const all = await zite.adminMembers.findAll({ filters: { role: 'Super Admin' }, limit: 50 });
    const winner = bootstrapWinner(all.records.map((r) => ({ id: r.id })));
    if (all.records.length > 1 && winner !== records[0].id) {
      await zite.adminMembers.delete({ id: records[0].id });
      await audit(context.user, 'bootstrap_super_admin_lost_race', 'members', records[0].id);
      throw new ZiteError({ code: 'FORBIDDEN', message: 'bootstrap race lost', userFacingMessage: MESSAGES.closed });
    }
    await audit(context.user, 'bootstrap_super_admin', 'members', records[0].id);
    return { ok: true };
  },
});
