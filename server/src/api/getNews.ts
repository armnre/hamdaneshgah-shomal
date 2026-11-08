import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Returns one published news article by slug',
  inputSchema: z.object({ slug: z.string() }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const res = await zite.sql({
      query: `SELECT n."id", n."title", n."excerpt", n."body", n."coverUrl", n."publishAt", n."isAnnouncement",
        c."name" AS "categoryName", a."name" AS "associationName", a."slug" AS "associationSlug"
        FROM "News" n
        LEFT JOIN "CategoriesNews" cn ON cn."newsId" = n."id" LEFT JOIN "Categories" c ON c."id" = cn."categoriesId"
        LEFT JOIN "AssociationsNews" an ON an."newsId" = n."id" LEFT JOIN "Associations" a ON a."id" = an."associationsId"
        WHERE n."slug" = $1 AND n."status" = 'Published' AND (n."publishAt" IS NULL OR n."publishAt" <= NOW()) LIMIT 1`,
      params: [input.slug],
    });
    const item = res.rows[0];
    if (!item) throw new ZiteError({ code: 'NOT_FOUND', message: 'news not found', userFacingMessage: 'خبر یافت نشد.' });
    const related = await zite.sql({
      query: `SELECT "title", "slug", "publishAt" FROM "News" WHERE "status" = 'Published' AND "id" <> $1
        AND ("publishAt" IS NULL OR "publishAt" <= NOW()) ORDER BY "publishAt" DESC NULLS LAST LIMIT 4`,
      params: [item.id],
    });
    return { news: item, related: related.rows };
  },
});
