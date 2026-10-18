import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAccess, audit, first } from '../lib/server';

const ENTITY = z.enum(['associations', 'faculties', 'majors', 'news', 'events', 'categories', 'media', 'members', 'messages']);
const TABLES = {
  associations: zite.associations, faculties: zite.faculties, majors: zite.majors, news: zite.news, events: zite.events,
  categories: zite.categories, media: zite.mediaAssets, members: zite.adminMembers, messages: zite.contactMessages,
};

export default createEndpoint({
  description: 'Deletes a record from an admin section (role-checked, audited)',
  authenticated: true,
  inputSchema: z.object({ entity: ENTITY, id: z.string().min(1) }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input, context }) => {
    const access = await requireAccess(context.user, input.entity);
    const table = TABLES[input.entity] as unknown as {
      findOne: (p: object) => Promise<Record<string, unknown> | undefined>;
      delete: (p: object) => Promise<unknown>;
    };
    const existing = await table.findOne({ id: input.id });
    if (!existing) throw new ZiteError({ code: 'NOT_FOUND', message: 'missing', userFacingMessage: 'مورد یافت نشد.' });
    if (access.role === 'Association Manager') {
      if (input.entity === 'media') throw new ZiteError({ code: 'FORBIDDEN', message: 'scope', userFacingMessage: 'حذف رسانه‌های مشترک فقط توسط ویراستار یا مدیر کل ممکن است.' });
      if (input.entity === 'associations') throw new ZiteError({ code: 'FORBIDDEN', message: 'scope', userFacingMessage: 'حذف انجمن فقط توسط مدیر کل ممکن است.' });
      if (['news', 'events'].includes(input.entity) && first(existing.association as string[]) !== access.associationId) {
        throw new ZiteError({ code: 'FORBIDDEN', message: 'scope', userFacingMessage: 'دسترسی به این مورد ندارید.' });
      }
    }
    if (input.entity === 'members' && first(existing.member as string[]) === context.user.id) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'self', userFacingMessage: 'نمی‌توانید نقش خودتان را حذف کنید.' });
    }
    if (input.entity === 'faculties') {
      const deps = await zite.majors.findAll({ filters: { faculty: input.id }, limit: 1 });
      if (deps.records.length) throw new ZiteError({ code: 'BAD_REQUEST', message: 'deps', userFacingMessage: 'ابتدا رشته‌های این دانشکده را حذف یا منتقل کنید.' });
    }
    await table.delete({ id: input.id });
    await audit(context.user, 'delete', input.entity, input.id, String(existing.title ?? existing.name ?? existing.label ?? ''));
    return { ok: true };
  },
});
