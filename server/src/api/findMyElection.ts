import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { audit } from '../lib/server';
import { normalizeNationalId, normalizeStudentNumber, maskStudentNumber, timingSafeEqual } from '../lib/policy';
import { hashNationalId, attemptBuckets, reserveAttempt, releaseAttempt, contextIp, requirePepper } from '../lib/voterHash';
import { syncAllDue } from '../lib/electionClock';
import { FACULTIES, type FacultySlug } from '../lib/majorMap';

// همان پیام کلی verifyVoter: مهاجم نمی‌فهمد کدام شناسه اشتباه بوده است.
const GENERIC = 'این شماره دانشجویی و کد ملی در فهرست واجدین رأی هیچ انجمنی پیدا نشد.';
const LOCKED = 'به دلیل تلاش‌های ناموفق متعدد، ورود موقتاً قفل شده است. حدود ۱۵ دقیقه دیگر دوباره تلاش کنید.';
const anon = { id: '', email: '' };

/**
 * رأی‌دهنده دیگر لازم نیست انجمنش را خودش پیدا کند: با شماره دانشجویی و کد ملی، انتخابات
 * (اعلام‌شده و نه بایگانی) که در فهرست واجدین آن است برگردانده می‌شود. هیچ نشستی باز نمی‌کند؛
 * ورود به برگه‌ی رأی همچنان فقط از verifyVoter است.
 */
export default createEndpoint({
  description: 'Finds which association election a student is eligible to vote in',
  inputSchema: z.object({ studentNumber: z.string().max(40), nationalId: z.string().max(40) }),
  outputSchema: z.object({
    majorName: z.string().nullable(),
    /** true = رشته انجمن ندارد و دانشجو یکی از انجمن‌های دانشکده‌اش را انتخاب می‌کند */
    choice: z.boolean(),
    facultyName: z.string().nullable(),
    /** انتخاباتی که قبلاً در آن رأی داده (برای رشته‌های بدون انجمن، در هر انجمن دانشکده) */
    votedIn: z.object({ electionId: z.string(), association: z.string().nullable() }).nullable(),
    options: z.array(z.object({ electionId: z.string(), association: z.string().nullable(), votingOpenNow: z.boolean() })),
  }),
  execute: async ({ input, context }) => {
    requirePepper();
    await syncAllDue();
    const sn = normalizeStudentNumber(input.studentNumber);
    const nid = normalizeNationalId(input.nationalId);
    const { ids, locked } = await reserveAttempt(await attemptBuckets(sn, contextIp(context)));
    if (locked) { await releaseAttempt(ids); throw new ZiteError({ code: 'RATE_LIMITED', message: 'locked', userFacingMessage: LOCKED }); }
    const masked = sn ? maskStudentNumber(sn) : 'invalid';
    const reject = async (reason: string): Promise<never> => {
      await audit(anon, 'voter_lookup_failed', 'elections', '-', `sn=${masked} reason=${reason}`);
      throw new ZiteError({ code: 'FORBIDDEN', message: 'not_found', userFacingMessage: GENERIC });
    };
    if (!sn || !nid) return reject('format');

    const r = await zite.sql({
      query: `SELECT v.id, v."electionId" AS eid, v."nationalIdHash" AS h, v."majorName" AS major, v."choiceGroup" AS g,
          e.status, e."votingStart" AS vs, e."votingEnd" AS ve, a.name AS association,
          EXISTS (SELECT 1 FROM "VoterParticipation" p WHERE p."voterId" = v.id) AS voted
        FROM "EligibleVoters" v JOIN "Elections" e ON e.id = v."electionId"
        LEFT JOIN "AssociationYearsElections" l ON l."electionsId" = e.id
        LEFT JOIN "AssociationYearsAssociations" la ON la."associationYearsId" = l."associationYearsId"
        LEFT JOIN "Associations" a ON a.id = la."associationsId"
        WHERE v."studentNumber" = $1 AND e.status NOT IN ('Draft', 'Cancelled', 'Archived')
        ORDER BY e."votingStart" DESC NULLS LAST, a.name LIMIT 30`,
      params: [sn],
    });
    const hits: Record<string, unknown>[] = [];
    for (const row of r.rows) {
      const h = await hashNationalId(String(row.eid), nid);
      if (timingSafeEqual(String(row.h ?? ''), h)) hits.push(row);
    }
    if (!r.rows.length) await hashNationalId('timing', nid); // زمان پاسخ وجود شماره را لو ندهد
    if (!hits.length) return reject('identity');
    await releaseAttempt(ids);

    // جدیدترین دوره: ردیف مستقیم (انجمن رشته) یا همه‌ی ردیف‌های یک گروه دانشکده
    const top = hits[0];
    const set = top.g ? hits.filter((h) => h.g === top.g) : [top];
    const now = new Date();
    const isOpen = (h: Record<string, unknown>) => h.status === 'Voting Open' && !!h.vs && !!h.ve && new Date(String(h.vs)) <= now && now <= new Date(String(h.ve));
    const voted = set.find((h) => h.voted);
    const faculty = top.g ? String(top.g).split(':')[1] as FacultySlug : null;
    return {
      majorName: top.major ? String(top.major) : null,
      choice: !!top.g,
      facultyName: faculty ? FACULTIES[faculty] ?? null : null,
      votedIn: voted ? { electionId: String(voted.eid), association: voted.association ? String(voted.association) : null } : null,
      options: set.map((h) => ({ electionId: String(h.eid), association: h.association ? String(h.association) : null, votingOpenNow: isOpen(h) })),
    };
  },
});
