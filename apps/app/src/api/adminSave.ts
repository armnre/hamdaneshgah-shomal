import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAccess, audit, slugify, first } from '../lib/server';
import { resolveMajor, canTransition, listsLocked, isSafeUrl, normalizeNationalId, normalizeStudentNumber, candidateApprovable } from '../lib/policy';
import { hashNationalId, mappedMajors } from '../lib/voterHash';

const s = (max: number) => z.string().trim().max(max).optional().nullable();
const httpUrl = (uploads = false) => z.string().trim().max(1000).refine((v) => isSafeUrl(v, uploads), 'فقط نشانی‌های http و https مجاز است.');
const url = httpUrl().optional().nullable().or(z.literal(''));
const imgUrl = httpUrl(true).optional().nullable().or(z.literal(''));
const id = z.string().optional().nullable().or(z.literal(''));
const status = z.enum(['Draft', 'Published', 'Archived']);

const SCHEMAS = {
  associations: z.object({ name: z.string().trim().min(2).max(150), slug: s(80), shortDescription: s(250), about: s(10000), logoUrl: imgUrl, coverUrl: imgUrl, faculty: id, major: id, contactEmail: z.string().email().optional().nullable().or(z.literal('')), telegramUrl: url, active: z.boolean().default(true), featured: z.boolean().default(false) }),
  faculties: z.object({ name: z.string().trim().min(2).max(150), slug: s(80), description: s(5000), imageUrl: imgUrl, sortOrder: z.number().int().optional().nullable(), active: z.boolean().default(true), verified: z.boolean().default(false) }),
  majors: z.object({ name: z.string().trim().min(2).max(150), faculty: z.string().min(1), description: s(5000), active: z.boolean().default(true), verified: z.boolean().default(false) }),
  news: z.object({ title: z.string().trim().min(3).max(250), slug: s(80), excerpt: s(600), body: s(50000), coverUrl: imgUrl, category: id, association: id, status, publishAt: z.string().optional().nullable(), featured: z.boolean().default(false), isAnnouncement: z.boolean().default(false) }),
  events: z.object({ title: z.string().trim().min(3).max(250), slug: s(80), summary: s(600), body: s(50000), coverUrl: imgUrl, kind: z.enum(['Event', 'Conference', 'Course', 'Call']), startAt: z.string().min(1), endAt: z.string().optional().nullable(), location: s(250), registrationUrl: url, association: id, status, featured: z.boolean().default(false) }),
  categories: z.object({ name: z.string().trim().min(2).max(80), slug: s(80) }),
  media: z.object({ title: z.string().trim().min(2).max(200), fileUrl: httpUrl(true), altText: s(300), source: s(500), license: s(200) }),
  members: z.object({ email: z.string().trim().email(), role: z.enum(['Super Admin', 'Content Editor', 'Association Manager']), association: id, active: z.boolean().default(true) }),
  settings: z.object({ key: z.string().trim().min(1).max(60), value: s(5000) }),
  messages: z.object({ status: z.enum(['New', 'Read', 'Closed']) }),
  years: z.object({ title: z.string().trim().regex(/^[۰-۹0-9]{4}-[۰-۹0-9]{4}$/, 'قالب سال'), status: z.enum(['Upcoming', 'Current', 'Archived']), sortOrder: z.number().int().optional().nullable() }),
  associationYears: z.object({ association: z.string().min(1), academicYear: z.string().min(1), needsUniversityApproval: z.boolean().default(false), active: z.boolean().default(true), notes: s(5000) }),
  associationMajors: z.object({ associationYear: z.string().min(1), major: z.string().min(1), needsUniversityApproval: z.boolean().default(false) }),
  positions: z.object({ name: z.string().trim().min(2).max(100), scope: z.enum(['Council', 'Association']), rank: z.number().int().optional().nullable() }),
  terms: z.object({ position: z.string().min(1), academicYear: z.string().min(1), associationYear: id, personName: s(150), personEmail: z.string().email().optional().nullable().or(z.literal('')), status: z.enum(['Undetermined', 'Active', 'Ended', 'Resigned']), startDate: z.string().optional().nullable(), endDate: z.string().optional().nullable(), publishName: z.boolean().default(false), notes: s(5000) }),
  elections: z.object({ title: z.string().trim().min(3).max(200), associationYear: z.string().min(1), status: z.enum(['Draft', 'Candidacy Open', 'Candidate Review', 'Final List', 'Voting Open', 'Closed', 'Counting', 'Results Confirmed', 'Results Published', 'Archived', 'Cancelled']), candidacyStart: z.string().optional().nullable(), candidacyEnd: z.string().optional().nullable(), votingStart: z.string().optional().nullable(), votingEnd: z.string().optional().nullable(), seats: z.number().int().min(1).max(50), maxChoicesPerVoter: z.number().int().min(1).max(50), description: s(10000) }),
  candidates: z.object({ fullName: z.string().trim().min(3).max(150), election: z.string().min(1), studentNumber: z.string().min(1), status: z.enum(['Pending', 'Approved', 'Rejected', 'Withdrawn']), statement: s(5000), photoUrl: imgUrl, reviewNote: s(2000) }),
  voters: z.object({ studentNumber: z.string().min(1), election: z.string().min(1), fullName: s(150), majorName: s(150), nationalId: z.string().optional().nullable() }),
};
type Entity = keyof typeof SCHEMAS;

const TABLES = {
  associations: zite.associations, faculties: zite.faculties, majors: zite.majors, news: zite.news, events: zite.events,
  categories: zite.categories, media: zite.mediaAssets, members: zite.adminMembers, settings: zite.siteSettings, messages: zite.contactMessages,
  years: zite.academicYears, associationYears: zite.associationYears, associationMajors: zite.associationMajors, positions: zite.positions, terms: zite.leadershipTerms,
  elections: zite.elections, candidates: zite.candidates, voters: zite.eligibleVoters,
};

async function activeSuperAdminCount(): Promise<number> {
  const r = await zite.sql({ query: `SELECT COUNT(*)::int AS n FROM "AdminMembers" WHERE "role" = 'Super Admin' AND "active" = true` });
  return Number(r.rows[0]?.n ?? 0);
}

const bad = (m: string) => { throw new ZiteError({ code: 'BAD_REQUEST', message: m, userFacingMessage: m }); };
const nameOf = async (sql: string, idv: unknown) => String((await zite.sql({ query: sql, params: [idv] })).rows[0]?.n ?? '');
// Integrity rules the Zite DB cannot express (Neon enforces the same with UNIQUE/CHECK in migration 0003).
const STRUCT = {
  years: async (d: Record<string, unknown>, id?: string) => {
    const dup = await zite.academicYears.findOne({ filters: { title: d.title as string } });
    if (dup && dup.id !== id) bad('این سال تحصیلی قبلاً ثبت شده است.');
    if (d.status === 'Current') {
      const cur = await zite.sql({ query: `SELECT id FROM "AcademicYears" WHERE "status" = 'Current' AND id <> $1`, params: [id ?? '00000000-0000-0000-0000-000000000000'] });
      if (cur.rows.length) bad('فقط یک سال می‌تواند «جاری» باشد؛ ابتدا سال جاری قبلی را بایگانی کنید.');
    }
  },
  associationYears: async (d: Record<string, unknown>, id?: string) => {
    const dup = await zite.sql({ query: `SELECT ay.id FROM "AssociationYears" ay JOIN "AssociationYearsAssociations" a ON a."associationYearsId" = ay.id JOIN "AcademicYearsAssociationYears" y ON y."associationYearsId" = ay.id WHERE a."associationsId" = $1 AND y."academicYearsId" = $2`, params: [d.association, d.academicYear] });
    if (dup.rows.some((r) => r.id !== id)) bad('این انجمن برای این سال قبلاً ثبت شده است.');
    d.title = `${await nameOf(`SELECT "name" AS n FROM "Associations" WHERE id = $1`, d.association)} — ${await nameOf(`SELECT "title" AS n FROM "AcademicYears" WHERE id = $1`, d.academicYear)}`;
    d.association = [d.association]; d.academicYear = [d.academicYear];
  },
  associationMajors: async (d: Record<string, unknown>, id?: string) => {
    // A major maps to exactly one association per academic year — this decides where its students vote.
    const clash = await zite.sql({ query: `
      SELECT am.id FROM "AssociationMajors" am
      JOIN "AssociationMajorsMajors" mm ON mm."associationMajorsId" = am.id
      JOIN "AssociationMajorsAssociationYears" l ON l."associationMajorsId" = am.id
      JOIN "AcademicYearsAssociationYears" y ON y."associationYearsId" = l."associationYearsId"
      WHERE mm."majorsId" = $1 AND y."academicYearsId" = (SELECT "academicYearsId" FROM "AcademicYearsAssociationYears" WHERE "associationYearsId" = $2 LIMIT 1)`, params: [d.major, d.associationYear] });
    if (clash.rows.some((r) => r.id !== id)) bad('این رشته در این سال به انجمن دیگری نگاشت شده است.');
    d.label = `${await nameOf(`SELECT "name" AS n FROM "Majors" WHERE id = $1`, d.major)} → ${await nameOf(`SELECT "title" AS n FROM "AssociationYears" WHERE id = $1`, d.associationYear)}`;
    d.associationYear = [d.associationYear]; d.major = [d.major];
  },
  positions: async () => {},
  terms: async (d: Record<string, unknown>, id?: string) => {
    if (id) {
      const prev = await zite.leadershipTerms.findOne({ id });
      if (prev && ['Ended', 'Resigned'].includes(String(prev.status))) bad('سوابق دوره‌های پایان‌یافته قابل ویرایش نیست؛ برای دوره جدید رکورد تازه بسازید.');
    }
    if (d.endDate && d.startDate && String(d.endDate) < String(d.startDate)) bad('تاریخ پایان باید بعد از تاریخ شروع باشد.');
    if (d.status === 'Active' && !d.personName) bad('برای دوره فعال، نام فرد الزامی است.');
    const pos = await nameOf(`SELECT "name" AS n FROM "Positions" WHERE id = $1`, d.position);
    const where = d.associationYear ? await nameOf(`SELECT "title" AS n FROM "AssociationYears" WHERE id = $1`, d.associationYear) : await nameOf(`SELECT "title" AS n FROM "AcademicYears" WHERE id = $1`, d.academicYear);
    d.label = `${pos} — ${where}`;
    d.position = [d.position]; d.academicYear = [d.academicYear]; d.associationYear = d.associationYear ? [d.associationYear] : [];
  },
  elections: async (d: Record<string, unknown>, id?: string) => {
    const prev = id ? await zite.elections.findOne({ id }) : undefined;
    const from = String(prev?.status ?? 'Draft');
    if (!id && d.status !== 'Draft') bad('انتخابات جدید باید در مرحله‌ی پیش‌نویس ساخته شود.');
    if (prev && !canTransition(from, String(d.status))) bad('این تغییر مرحله مجاز نیست؛ مراحل باید به ترتیب طی شوند.');
    if (prev && listsLocked(from)) {
      // From the final list onwards only the stage may change; dates, seats and rules are frozen.
      for (const k of ['candidacyStart', 'candidacyEnd', 'votingStart', 'votingEnd', 'seats', 'maxChoicesPerVoter', 'associationYear'] as const) {
        const a = prev[k as keyof typeof prev], b = d[k];
        const same = k === 'associationYear' ? String(Array.isArray(a) ? a[0] : a) === String(b) : (a == null && (b == null || b === '')) || (a != null && b != null && (typeof b === 'number' ? Number(a) === b : new Date(String(a)).getTime() === new Date(String(b)).getTime()));
        if (!same) bad('پس از نهایی شدن فهرست، زمان‌بندی و قواعد انتخابات قابل تغییر نیست.');
      }
    }
    if (d.status === 'Final List' && from !== 'Final List') {
      // Candidate rule re-checked at freeze time: every approved candidate must be an eligible voter of this election
      const bad1 = await zite.sql({ query: `SELECT c."fullName" FROM "Candidates" c JOIN "CandidatesElections" l ON l."candidatesId" = c.id WHERE l."electionsId" = $1 AND c.status = 'Approved' AND NOT EXISTS (SELECT 1 FROM "EligibleVoters" v JOIN "ElectionsEligibleVoters" ev ON ev."eligibleVotersId" = v.id WHERE ev."electionsId" = $1 AND v."studentNumber" = c."studentNumber") LIMIT 3`, params: [id] });
      if (bad1.rows.length) bad(`این نامزدهای تأییدشده در فهرست واجدین نیستند: ${bad1.rows.map((r) => r.fullName).join('، ')}`);
    }
    if (d.status === 'Voting Open' && from !== 'Voting Open') {
      const c = await zite.sql({ query: `SELECT (SELECT COUNT(*) FROM "Candidates" c JOIN "CandidatesElections" l ON l."candidatesId" = c.id WHERE l."electionsId" = $1 AND c.status = 'Approved')::int AS cands, (SELECT COUNT(*) FROM "ElectionsEligibleVoters" WHERE "electionsId" = $1)::int AS voters`, params: [id] });
      if (!Number(c.rows[0]?.cands)) bad('برای شروع رأی‌گیری دست‌کم یک نامزد تأییدشده لازم است.');
      if (!Number(c.rows[0]?.voters)) bad('برای شروع رأی‌گیری فهرست واجدین نباید خالی باشد.');
    }
    const lt = (a: unknown, b: unknown) => a && b && String(b) < String(a);
    if (lt(d.candidacyStart, d.candidacyEnd)) bad('پایان ثبت‌نام باید بعد از شروع آن باشد.');
    if (lt(d.votingStart, d.votingEnd)) bad('پایان رأی‌گیری باید بعد از شروع آن باشد.');
    if (lt(d.candidacyEnd, d.votingStart)) bad('رأی‌گیری باید بعد از پایان ثبت‌نام نامزدها شروع شود.');
    if (Number(d.maxChoicesPerVoter) > Number(d.seats)) bad('حداکثر انتخاب هر رأی‌دهنده نمی‌تواند از تعداد کرسی‌ها بیشتر باشد.');
    if (['Voting Open', 'Closed', 'Results Published'].includes(String(d.status)) && (!d.votingStart || !d.votingEnd)) bad('برای این وضعیت، زمان شروع و پایان رأی‌گیری الزامی است.');
    d.associationYear = [d.associationYear];
  },
  candidates: async (d: Record<string, unknown>, id?: string) => {
    const ce = await zite.elections.findOne({ id: String(d.election) });
    if (listsLocked(String(ce?.status))) bad('فهرست نامزدهای این انتخابات نهایی شده و قابل تغییر نیست.');
    const sn = normalizeStudentNumber(String(d.studentNumber));
    if (!sn) bad('شماره دانشجویی نامعتبر است.');
    d.studentNumber = sn;
    const dup = await zite.sql({ query: `SELECT c.id FROM "Candidates" c JOIN "CandidatesElections" l ON l."candidatesId" = c.id WHERE l."electionsId" = $1 AND c."studentNumber" = $2`, params: [d.election, sn] });
    if (dup.rows.some((r) => r.id !== id)) bad('این دانشجو قبلاً در این انتخابات نامزد شده است.');
    const voters = await zite.sql({ query: `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE v."studentNumber" = $2)::int AS me FROM "EligibleVoters" v JOIN "ElectionsEligibleVoters" l ON l."eligibleVotersId" = v.id WHERE l."electionsId" = $1`, params: [d.election, sn] });
    if (d.status === 'Approved' && !candidateApprovable(Number(voters.rows[0]?.n), Number(voters.rows[0]?.me) > 0)) bad('نامزد فقط وقتی تأیید می‌شود که در فهرست واجدین همین انتخابات باشد؛ ابتدا فهرست واجدین را وارد کنید.');
    d.election = [d.election];
  },
  voters: async (d: Record<string, unknown>, id?: string) => {
    const sn = normalizeStudentNumber(String(d.studentNumber));
    if (!sn) bad('شماره دانشجویی نامعتبر است.');
    d.studentNumber = sn;
    const dup = await zite.sql({ query: `SELECT v.id FROM "EligibleVoters" v JOIN "ElectionsEligibleVoters" l ON l."eligibleVotersId" = v.id WHERE l."electionsId" = $1 AND v."studentNumber" = $2`, params: [d.election, sn] });
    if (dup.rows.some((r) => r.id !== id)) bad('این شماره دانشجویی در این انتخابات قبلاً ثبت شده است.');
    const el = await zite.elections.findOne({ id: String(d.election) });
    if (listsLocked(String(el?.status))) bad('پس از نهایی شدن فهرست، فهرست واجدین قابل تغییر نیست. پس از شروع رأی‌گیری، فهرست واجدین قابل تغییر نیست.');
    // Major → association rule: the voter's major must be mapped to this election's association
    const majorId = resolveMajor(String(d.majorName ?? ''), await mappedMajors(String(d.election)));
    if (!majorId) bad('رشته‌ی این دانشجو به انجمن این انتخابات نگاشت نشده است.');
    d.major = [majorId];
    if (d.nationalId) {
      const nid = normalizeNationalId(String(d.nationalId));
      if (!nid) bad('کد ملی نامعتبر است.');
      d.nationalIdHash = await hashNationalId(String(d.election), nid!);
      d.nationalIdLast4 = nid!.slice(-4);
    } else if (!id) bad('کد ملی الزامی است.');
    delete d.nationalId;
    d.election = [d.election];
  },
};

export default createEndpoint({
  description: 'Creates or updates a record in an admin section with validation and audit logging',
  authenticated: true,
  inputSchema: z.object({ entity: z.enum(Object.keys(SCHEMAS) as [Entity, ...Entity[]]), id: z.string().optional(), data: z.record(z.any()) }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input, context }) => {
    const access = await requireAccess(context.user, input.entity);
    const parsed = SCHEMAS[input.entity].safeParse(input.data);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ZiteError({ code: 'BAD_REQUEST', message: parsed.error.message, userFacingMessage: `فیلد «${issue?.path.join('.')}» معتبر نیست.` });
    }
    const data: Record<string, unknown> = { ...parsed.data };
    for (const k of Object.keys(data)) if (data[k] === '') data[k] = null;
    const table = TABLES[input.entity] as unknown as {
      findOne: (p: object) => Promise<Record<string, unknown> | undefined>;
      create: (p: object) => Promise<{ id: string }>;
      update: (p: object) => Promise<{ id: string }>;
    };

    // Association managers may only touch their own association's records
    if (access.role === 'Association Manager') {
      if (input.entity === 'associations') {
        if (!input.id || input.id !== access.associationId) throw new ZiteError({ code: 'FORBIDDEN', message: 'scope', userFacingMessage: 'فقط انجمن خودتان قابل ویرایش است.' });
        delete data.active; delete data.featured;
      }
      if (input.entity === 'media' && input.id) throw new ZiteError({ code: 'FORBIDDEN', message: 'scope', userFacingMessage: 'ویرایش رسانه‌های مشترک فقط توسط ویراستار یا مدیر کل ممکن است.' });
      if (input.entity === 'news' || input.entity === 'events') {
        data.association = access.associationId;
        if (input.id) {
          const existing = await table.findOne({ id: input.id });
          if (first(existing?.association as string[]) !== access.associationId) throw new ZiteError({ code: 'FORBIDDEN', message: 'scope', userFacingMessage: 'دسترسی به این مورد ندارید.' });
        }
      }
    }

    if (['associations', 'faculties', 'news', 'events', 'categories'].includes(input.entity)) {
      data.slug = slugify(String(data.slug || data.name || data.title));
      const dup = await table.findOne({ filters: { slug: data.slug } });
      if (dup && dup.id !== input.id) throw new ZiteError({ code: 'BAD_REQUEST', message: 'dup slug', userFacingMessage: 'این نشانی (slug) قبلاً استفاده شده است.' });
    }
    if (input.entity === 'news' && data.status === 'Published' && !data.publishAt) data.publishAt = new Date().toISOString();
    if (input.entity === 'events' && data.endAt && String(data.endAt) < String(data.startAt)) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'dates', userFacingMessage: 'زمان پایان باید بعد از زمان شروع باشد.' });
    }
    if (input.entity === 'members') {
      const { records } = await zite.auth.findAllUsers({ filters: { email: String(data.email).toLowerCase() }, limit: 1 });
      const u = records[0];
      if (!u) throw new ZiteError({ code: 'BAD_REQUEST', message: 'no user', userFacingMessage: 'کاربری با این ایمیل یافت نشد؛ ابتدا باید یک‌بار وارد سامانه شود.' });
      if (data.role === 'Association Manager' && !data.association) throw new ZiteError({ code: 'BAD_REQUEST', message: 'assoc', userFacingMessage: 'برای مدیر انجمن، انجمن را انتخاب کنید.' });
      if (u.id === context.user.id && (data.role !== 'Super Admin' || !data.active)) throw new ZiteError({ code: 'BAD_REQUEST', message: 'self', userFacingMessage: 'نمی‌توانید دسترسی خودتان را کاهش دهید.' });
      const dup = await zite.adminMembers.findOne({ filters: { member: u.id } });
      if (dup && dup.id !== input.id) throw new ZiteError({ code: 'BAD_REQUEST', message: 'dup', userFacingMessage: 'این کاربر قبلاً نقش دارد.' });
      delete data.email;
      data.member = u.id; data.label = u.email;
      if (data.role !== 'Association Manager') data.association = null;
    }

    if (input.entity in STRUCT) await STRUCT[input.entity as keyof typeof STRUCT](data, input.id);
    if (input.entity === 'members' && input.id) {
      const prev = await zite.adminMembers.findOne({ id: input.id });
      const losesSuper = prev?.role === 'Super Admin' && prev?.active && (data.role !== 'Super Admin' || !data.active);
      if (losesSuper && (await activeSuperAdminCount()) <= 1) throw new ZiteError({ code: 'BAD_REQUEST', message: 'last super admin', userFacingMessage: 'آخرین مدیر کل فعال را نمی‌توان غیرفعال یا تنزل داد.' });
    }
    const res = input.id ? await table.update({ id: input.id, record: data }) : await table.create({ record: data });
    const summary = Object.keys(data).filter((k) => !['body', 'about'].includes(k)).join(', ');
    await audit(context.user, input.id ? 'update' : 'create', input.entity, res.id, `fields: ${summary}`);
    return { id: res.id };
  },
});
