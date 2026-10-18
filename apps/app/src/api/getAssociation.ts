import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { first } from '../lib/server';

export default createEndpoint({
  description: 'Returns one association with its published news and events',
  inputSchema: z.object({ slug: z.string() }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const a = await zite.associations.findOne({ filters: { slug: input.slug, active: true } });
    if (!a) throw new ZiteError({ code: 'NOT_FOUND', message: 'association not found', userFacingMessage: 'انجمن یافت نشد.' });
    const fid = first(a.faculty), mid = first(a.major);
    const [faculty, major, news, events] = await Promise.all([
      fid ? zite.faculties.findOne({ id: fid }) : undefined,
      mid ? zite.majors.findOne({ id: mid }) : undefined,
      zite.sql({
        query: `SELECT n."id", n."title", n."slug", n."excerpt", n."coverUrl", n."publishAt" FROM "News" n
          JOIN "AssociationsNews" an ON an."newsId" = n."id" WHERE an."associationsId" = $1
          AND n."status" = 'Published' AND (n."publishAt" IS NULL OR n."publishAt" <= NOW())
          ORDER BY n."publishAt" DESC NULLS LAST LIMIT 12`,
        params: [a.id],
      }),
      zite.sql({
        query: `SELECT e."id", e."title", e."slug", e."kind", e."startAt", e."endAt", e."location", e."coverUrl" FROM "Events" e
          JOIN "AssociationsEvents" ae ON ae."eventsId" = e."id" WHERE ae."associationsId" = $1 AND e."status" = 'Published'
          ORDER BY e."startAt" DESC NULLS LAST LIMIT 12`,
        params: [a.id],
      }),
    ]);
    return {
      association: {
        id: a.id, name: a.name ?? '', shortDescription: a.shortDescription ?? '', about: a.about ?? '',
        logoUrl: a.logoUrl ?? '', coverUrl: a.coverUrl ?? '', contactEmail: a.contactEmail ?? '', telegramUrl: a.telegramUrl ?? '',
        facultyName: faculty?.name ?? '', facultySlug: faculty?.slug ?? '', majorName: major?.name ?? '',
      },
      news: news.rows,
      events: events.rows,
    };
  },
});
