import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Returns one published event/course by slug',
  inputSchema: z.object({ slug: z.string() }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const res = await zite.sql({
      query: `SELECT e."id", e."title", e."summary", e."body", e."coverUrl", e."kind", e."startAt", e."endAt", e."location", e."registrationUrl",
        a."name" AS "associationName", a."slug" AS "associationSlug"
        FROM "Events" e LEFT JOIN "AssociationsEvents" ae ON ae."eventsId" = e."id" LEFT JOIN "Associations" a ON a."id" = ae."associationsId"
        WHERE e."slug" = $1 AND e."status" = 'Published' LIMIT 1`,
      params: [input.slug],
    });
    if (!res.rows[0]) throw new ZiteError({ code: 'NOT_FOUND', message: 'event not found', userFacingMessage: 'رویداد یافت نشد.' });
    return { event: res.rows[0] };
  },
});
