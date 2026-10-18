import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

// Public org chart. A holder's name leaves the server ONLY when the term is
// marked "Publish Name" by an admin — otherwise it is sent as null.
export default createEndpoint({
  description: 'Returns the public, year-by-year association structure (names only when published)',
  inputSchema: z.object({}),
  outputSchema: z.object({
    years: z.array(z.object({
      id: z.string(), title: z.string(), status: z.string(),
      associations: z.array(z.object({
        id: z.string(), name: z.string(), slug: z.string().nullable(), faculty: z.string().nullable(),
        needsApproval: z.boolean(), majors: z.array(z.string()),
        leaders: z.array(z.object({ position: z.string(), holder: z.string().nullable(), status: z.string() })),
      })),
    })),
  }),
  execute: async () => {
    const [years, ays, majors, terms] = await Promise.all([
      zite.sql({ query: `SELECT id, "title", "status" FROM "AcademicYears" ORDER BY "sortOrder" DESC NULLS LAST` }),
      zite.sql({ query: `
        SELECT ay.id, ya."academicYearsId" AS "yearId", a."name", a."slug", ay."needsUniversityApproval" AS "needsApproval",
               (SELECT f."name" FROM "AssociationsFaculties" af JOIN "Faculties" f ON f.id = af."facultiesId" WHERE af."associationsId" = a.id LIMIT 1) AS "faculty"
        FROM "AssociationYears" ay
        JOIN "AcademicYearsAssociationYears" ya ON ya."associationYearsId" = ay.id
        JOIN "AssociationYearsAssociations" aa ON aa."associationYearsId" = ay.id
        JOIN "Associations" a ON a.id = aa."associationsId"
        WHERE ay."active" = true AND a."active" = true
        ORDER BY a."name"` }),
      zite.sql({ query: `
        SELECT l."associationYearsId" AS "ayId", m."name"
        FROM "AssociationMajors" am
        JOIN "AssociationMajorsAssociationYears" l ON l."associationMajorsId" = am.id
        JOIN "AssociationMajorsMajors" mm ON mm."associationMajorsId" = am.id
        JOIN "Majors" m ON m.id = mm."majorsId"` }),
      zite.sql({ query: `
        SELECT t."status", t."publishName", t."personName", p."name" AS "position", p."rank",
               (SELECT x."academicYearsId" FROM "AcademicYearsLeadershipTerms" x WHERE x."leadershipTermsId" = t.id LIMIT 1) AS "yearId",
               (SELECT x."associationYearsId" FROM "AssociationYearsLeadershipTerms" x WHERE x."leadershipTermsId" = t.id LIMIT 1) AS "ayId"
        FROM "LeadershipTerms" t
        JOIN "LeadershipTermsPositions" lp ON lp."leadershipTermsId" = t.id
        JOIN "Positions" p ON p.id = lp."positionsId"
        ORDER BY p."rank"` }),
    ]);
    const leader = (t: Record<string, unknown>) => ({
      position: String(t.position),
      holder: t.publishName && t.personName ? String(t.personName) : null,
      status: String(t.status ?? 'Undetermined'),
    });
    return {
      years: years.rows.map((y) => ({
        id: String(y.id), title: String(y.title), status: String(y.status ?? ''),
        associations: ays.rows.filter((a) => a.yearId === y.id).map((a) => ({
          id: String(a.id), name: String(a.name), slug: a.slug ? String(a.slug) : null,
          faculty: a.faculty ? String(a.faculty) : null, needsApproval: !!a.needsApproval,
          majors: majors.rows.filter((m) => m.ayId === a.id).map((m) => String(m.name)),
          // Only the association secretary is shown (council / secretary-of-secretaries removed)
          leaders: terms.rows.filter((t) => t.ayId === a.id).slice(0, 1).map(leader),
        })),
      })),
    };
  },
});
