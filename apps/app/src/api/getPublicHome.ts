import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { getSettingsMap } from '../lib/server';

export default createEndpoint({
  description: 'Loads everything the public home page shows',
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async () => {
    const [settings, assoc, news, events, faculties, stats] = await Promise.all([
      getSettingsMap(),
      zite.sql({
        query: `SELECT a."id", a."name", a."slug", a."shortDescription", a."logoUrl", a."coverUrl", f."name" AS "facultyName"
          FROM "Associations" a
          LEFT JOIN "AssociationsFaculties" af ON af."associationsId" = a."id"
          LEFT JOIN "Faculties" f ON f."id" = af."facultiesId"
          WHERE a."active" = true ORDER BY a."featured" DESC NULLS LAST, a."name" LIMIT 6`,
      }),
      zite.sql({
        query: `SELECT n."id", n."title", n."slug", n."excerpt", n."coverUrl", n."publishAt", n."isAnnouncement", c."name" AS "categoryName"
          FROM "News" n
          LEFT JOIN "CategoriesNews" cn ON cn."newsId" = n."id"
          LEFT JOIN "Categories" c ON c."id" = cn."categoriesId"
          WHERE n."status" = 'Published' AND (n."publishAt" IS NULL OR n."publishAt" <= NOW())
          ORDER BY n."featured" DESC NULLS LAST, n."publishAt" DESC NULLS LAST LIMIT 5`,
      }),
      zite.sql({
        query: `SELECT "id", "title", "slug", "summary", "coverUrl", "kind", "startAt", "endAt", "location"
          FROM "Events" WHERE "status" = 'Published' AND COALESCE("endAt", "startAt") >= NOW()
          ORDER BY "startAt" ASC LIMIT 6`,
      }),
      zite.sql({
        query: `SELECT f."id", f."name", f."slug", f."description",
          (SELECT COUNT(*)::int FROM "FacultiesMajors" fm JOIN "Majors" m ON m."id" = fm."majorsId" WHERE fm."facultiesId" = f."id" AND m."active" = true) AS "majorCount",
          (SELECT COUNT(*)::int FROM "AssociationsFaculties" af JOIN "Associations" a ON a."id" = af."associationsId" WHERE af."facultiesId" = f."id" AND a."active" = true) AS "associationCount"
          FROM "Faculties" f WHERE f."active" = true ORDER BY f."sortOrder" NULLS LAST, f."name"`,
      }),
      zite.sql({
        query: `SELECT
          (SELECT COUNT(*)::int FROM "Associations" WHERE "active" = true) AS "associations",
          (SELECT COUNT(*)::int FROM "Faculties" WHERE "active" = true) AS "faculties",
          (SELECT COUNT(*)::int FROM "Majors" WHERE "active" = true) AS "majors",
          (SELECT COUNT(*)::int FROM "Events" WHERE "status" = 'Published') AS "events"`,
      }),
    ]);
    return {
      settings,
      associations: assoc.rows,
      news: news.rows,
      events: events.rows,
      faculties: faculties.rows,
      stats: stats.rows[0],
    };
  },
});
