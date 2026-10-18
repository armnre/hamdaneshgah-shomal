// Drop-in replacement for `zitejs/db` on Netlify: the same table-client + sql() API,
// backed by Neon Postgres. The app's endpoint files run against it unchanged.
import { neon } from '@neondatabase/serverless';

type Kind = 'text' | 'bool' | 'num' | 'ts' | 'link' | 'auto';
type Row = Record<string, unknown>;

const SCHEMA: Record<string, Record<string, Kind>> = {
  Faculties: { name: 'text', slug: 'text', description: 'text', imageUrl: 'text', sortOrder: 'num', active: 'bool', verified: 'bool' },
  Majors: { name: 'text', faculty: 'link', description: 'text', active: 'bool', verified: 'bool' },
  Associations: { name: 'text', slug: 'text', shortDescription: 'text', about: 'text', logoUrl: 'text', coverUrl: 'text', faculty: 'link', major: 'link', contactEmail: 'text', telegramUrl: 'text', active: 'bool', featured: 'bool' },
  Categories: { name: 'text', slug: 'text' },
  News: { title: 'text', slug: 'text', excerpt: 'text', body: 'text', coverUrl: 'text', category: 'link', association: 'link', status: 'text', publishAt: 'ts', featured: 'bool', isAnnouncement: 'bool' },
  Events: { title: 'text', slug: 'text', summary: 'text', body: 'text', coverUrl: 'text', kind: 'text', startAt: 'ts', endAt: 'ts', location: 'text', registrationUrl: 'text', association: 'link', status: 'text', featured: 'bool' },
  MediaAssets: { title: 'text', fileUrl: 'text', altText: 'text', source: 'text', license: 'text', uploadedAt: 'auto' },
  AdminMembers: { label: 'text', member: 'link', role: 'text', association: 'link', active: 'bool' },
  AuditLogs: { action: 'text', entity: 'text', entityId: 'text', details: 'text', actor: 'link', actorEmail: 'text', loggedAt: 'auto' },
  SiteSettings: { key: 'text', value: 'text' },
  AcademicYears: { title: 'text', status: 'text', startDate: 'ts', endDate: 'ts', sortOrder: 'num' },
  AssociationYears: { title: 'text', association: 'link', academicYear: 'link', active: 'bool', needsUniversityApproval: 'bool', notes: 'text' },
  AssociationMajors: { label: 'text', associationYear: 'link', major: 'link', needsUniversityApproval: 'bool' },
  Positions: { name: 'text', scope: 'text', rank: 'num' },
  LeadershipTerms: { label: 'text', personName: 'text', personEmail: 'text', academicYear: 'link', associationYear: 'link', position: 'link', status: 'text', startDate: 'ts', endDate: 'ts', publishName: 'bool', notes: 'text' },
  ContactMessages: { subject: 'text', senderName: 'text', senderEmail: 'text', message: 'text', status: 'text', receivedAt: 'auto' },
};

let client: ReturnType<typeof neon> | null = null;
export function db() {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}

export async function query(text: string, params: unknown[] = []): Promise<Row[]> {
  const rows = (await db().query(text, params)) as Row[];
  return rows.map(normalize);
}

function normalize(r: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(r)) out[k] = v instanceof Date ? v.toISOString() : v;
  return out;
}

const q = (id: string) => `"${id.replace(/"/g, '')}"`;

function toDb(kind: Kind, v: unknown): unknown {
  if (v === undefined || v === null || v === '') return kind === 'link' ? '[]' : null;
  switch (kind) {
    case 'link': return JSON.stringify((Array.isArray(v) ? v : [v]).map(String));
    case 'bool': return v === true || v === 'true';
    case 'num': return Number(v);
    case 'ts': return v instanceof Date ? v.toISOString() : String(v);
    default: return String(v);
  }
}

function fromDb(table: string, r: Row) {
  const fields = SCHEMA[table];
  const out: Row = { id: r.id };
  for (const k of Object.keys(fields)) if (r[k] !== null && r[k] !== undefined) out[k] = r[k];
  return out;
}

function where(table: string, filters: Row | undefined, params: unknown[]) {
  const fields = SCHEMA[table];
  const parts: string[] = [];
  for (const [k, v] of Object.entries(filters ?? {})) {
    if (v === undefined) continue;
    if (k !== 'id' && !fields[k]) throw new Error(`Unknown field ${table}.${k}`);
    if (v === null) { parts.push(`${q(k)} IS NULL`); continue; }
    params.push(fields[k] === 'link' ? String(v) : toDb(fields[k] ?? 'text', v));
    parts.push(fields[k] === 'link' ? `${q(k)} ? $${params.length}` : `${q(k)} = $${params.length}`);
  }
  return parts.length ? ` WHERE ${parts.join(' AND ')}` : '';
}

function writable(table: string, record: Row) {
  const fields = SCHEMA[table];
  return Object.keys(record).filter((k) => fields[k] && fields[k] !== 'auto' && record[k] !== undefined);
}

function tableClient<T = Row>(table: string) {
  const insert = async (record: Row) => {
    const cols = writable(table, record);
    const params = cols.map((c) => toDb(SCHEMA[table][c], record[c]));
    const sql = cols.length
      ? `INSERT INTO ${q(table)} (${cols.map(q).join(', ')}) VALUES (${cols.map((c, i) => (SCHEMA[table][c] === 'link' ? `$${i + 1}::jsonb` : `$${i + 1}`)).join(', ')}) RETURNING *`
      : `INSERT INTO ${q(table)} DEFAULT VALUES RETURNING *`;
    return fromDb(table, (await query(sql, params))[0]) as T & { id: string };
  };
  const update = async ({ id, record }: { id: string; record: Row }) => {
    const cols = writable(table, record);
    const params: unknown[] = cols.map((c) => toDb(SCHEMA[table][c], record[c]));
    params.push(id);
    const set = [...cols.map((c, i) => `${q(c)} = $${i + 1}${SCHEMA[table][c] === 'link' ? '::jsonb' : ''}`), 'updated_at = now()'];
    const rows = await query(`UPDATE ${q(table)} SET ${set.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (!rows[0]) throw new Error(`${table} ${id} not found`);
    return fromDb(table, rows[0]) as T & { id: string };
  };
  const findAll = async (p: { filters?: Row; limit?: number; offset?: number } = {}) => {
    const params: unknown[] = [];
    const limit = Math.min(p.limit ?? 500, 2000);
    const rows = await query(`SELECT * FROM ${q(table)}${where(table, p.filters, params)} ORDER BY created_at, id LIMIT ${limit + 1} OFFSET ${Math.max(0, p.offset ?? 0)}`, params);
    return { records: rows.slice(0, limit).map((r) => fromDb(table, r)) as (T & { id: string })[], hasMore: rows.length > limit };
  };
  return {
    findAll,
    async findOne(p: { id?: string; filters?: Row }) {
      const { records } = await findAll({ filters: p.id ? { ...(p.filters ?? {}), id: p.id } : p.filters, limit: 1 });
      return records[0];
    },
    async create(p: { record: Row }) { return insert(p.record); },
    update,
    async delete(p: { id: string }) {
      await query(`DELETE FROM ${q(table)} WHERE id = $1`, [p.id]);
      return { id: p.id };
    },
    async bulkCreate(p: { records: Row[]; matchOn?: string[] }) {
      if (p.records.length > 100) throw new Error('bulkCreate is capped at 100 records');
      const out: (T & { id: string })[] = [];
      for (const record of p.records) {
        const match = async () => p.matchOn?.length
          ? (await findAll({ filters: Object.fromEntries(p.matchOn.map((k) => [k, first(record[k])])), limit: 1 })).records[0]
          : undefined;
        const existing = await match();
        if (existing) { out.push(await update({ id: existing.id, record })); continue; }
        try { out.push(await insert(record)); } catch (e) {
          const again = await match(); // lost a race against a unique index — fall back to update
          if (!again) throw e;
          out.push(await update({ id: again.id, record }));
        }
      }
      return { records: out };
    },
  };
}

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const zite = {
  faculties: tableClient('Faculties'),
  majors: tableClient('Majors'),
  associations: tableClient('Associations'),
  categories: tableClient('Categories'),
  news: tableClient('News'),
  events: tableClient('Events'),
  mediaAssets: tableClient('MediaAssets'),
  adminMembers: tableClient('AdminMembers'),
  auditLogs: tableClient('AuditLogs'),
  siteSettings: tableClient('SiteSettings'),
  contactMessages: tableClient('ContactMessages'),
  academicYears: tableClient('AcademicYears'),
  associationYears: tableClient('AssociationYears'),
  associationMajors: tableClient('AssociationMajors'),
  positions: tableClient('Positions'),
  leadershipTerms: tableClient('LeadershipTerms'),
  async sql(p: { query: string; params?: unknown[] }) {
    if (!/^\s*(select|with)\b/i.test(p.query)) throw new Error('zite.sql is read-only');
    return { rows: await query(p.query, p.params ?? []) };
  },
  auth: {
    async findAllUsers(p: { filters?: { email?: string }; limit?: number } = {}) {
      const params: unknown[] = [];
      let w = '';
      if (p.filters?.email) { params.push(p.filters.email.toLowerCase()); w = ` WHERE lower("email") = $1`; }
      const records = await query(`SELECT id, "email", "name", "firstName", "lastName", "image" FROM "ziteUsers"${w} ORDER BY created_at LIMIT ${Math.min(p.limit ?? 100, 1000)}`, params);
      return { records: records as unknown as { id: string; email: string; name: string; image: string | null }[], total: records.length, hasMore: false };
    },
  },
};
