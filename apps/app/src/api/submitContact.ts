import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const schema = z.object({
  senderName: z.string().trim().min(2).max(100),
  senderEmail: z.string().trim().email().max(200),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(3000),
  website: z.string().max(0).optional(), // honeypot
});

export default createEndpoint({
  description: 'Stores a contact-form message from a visitor',
  inputSchema: schema,
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input }) => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new ZiteError({ code: 'BAD_REQUEST', message: 'invalid contact', userFacingMessage: 'اطلاعات فرم معتبر نیست.' });
    if (parsed.data.website) return { ok: true };
    // Basic flood protection: max 3 messages per email per hour
    const recent = await zite.sql({
      query: `SELECT COUNT(*)::int AS "c" FROM "ContactMessages" WHERE "senderEmail" = $1 AND "receivedAt" > NOW() - INTERVAL '1 hour'`,
      params: [parsed.data.senderEmail],
    });
    if (Number(recent.rows[0]?.c ?? 0) >= 3) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'rate limited', userFacingMessage: 'تعداد پیام‌های شما زیاد است؛ لطفاً بعداً تلاش کنید.' });
    }
    const { website: _w, ...rec } = parsed.data;
    await zite.contactMessages.create({ record: { ...rec, status: 'New' } });
    return { ok: true };
  },
});
