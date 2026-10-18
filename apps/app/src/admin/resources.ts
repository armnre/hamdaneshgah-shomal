import { KIND_LABEL, ROLE_LABEL, STATUS_LABEL } from '../lib/format';

export type FieldType = 'text' | 'textarea' | 'markdown' | 'url' | 'image' | 'email' | 'number' | 'checkbox' | 'datetime' | 'select';
export type OptionSource = 'faculties' | 'majors' | 'categories' | 'associations' | 'years' | 'associationYears' | 'positions' | 'elections';
export type Field = {
  name: string; label: string; type: FieldType; required?: boolean; hint?: string;
  options?: { value: string; label: string }[]; source?: OptionSource; wide?: boolean; dir?: 'ltr';
};
export type Column = { key: string; label: string; kind?: 'date' | 'status' | 'bool' | 'lookup' | 'label'; source?: OptionSource; map?: Record<string, string> };
export type Resource = {
  entity: 'associations' | 'faculties' | 'majors' | 'news' | 'events' | 'categories' | 'media' | 'members' | 'years' | 'associationYears' | 'associationMajors' | 'positions' | 'terms' | 'elections' | 'candidates' | 'voters';
  title: string; singular: string; fields: Field[]; columns: Column[]; search: string[]; defaults?: Record<string, unknown>;
};

const opts = (m: Record<string, string>) => Object.entries(m).map(([value, label]) => ({ value, label }));
const statusOpts = opts({ Draft: STATUS_LABEL.Draft, Published: STATUS_LABEL.Published, Archived: STATUS_LABEL.Archived });

const YEAR_STATUS = { Upcoming: 'آینده', Current: 'جاری', Archived: 'بایگانی' };
const TERM_STATUS = { Undetermined: 'تعیین‌نشده', Active: 'فعال', Ended: 'پایان‌یافته', Resigned: 'مستعفی' };
const SCOPE = { Council: 'شورای دبیران', Association: 'انجمن' };
export const ELECTION_STATUS = { Draft: 'پیش‌نویس', 'Candidacy Open': 'ثبت‌نام نامزدها', 'Candidate Review': 'بررسی نامزدها', 'Voting Open': 'رأی‌گیری', Closed: 'پایان‌یافته', 'Results Published': 'نتایج اعلام‌شده' };
const CANDIDATE_STATUS = { Pending: 'در انتظار بررسی', Approved: 'تأییدشده', Rejected: 'ردشده', Withdrawn: 'انصراف' };

export const RESOURCES: Record<string, Resource> = {
  elections: {
    entity: 'elections', title: 'انتخابات', singular: 'انتخابات', search: ['title'], defaults: { status: 'Draft', seats: 5, maxChoicesPerVoter: 3 },
    columns: [{ key: 'title', label: 'عنوان' }, { key: 'associationYear', label: 'انجمنِ سال', kind: 'lookup', source: 'associationYears' }, { key: 'status', label: 'وضعیت', kind: 'label', map: ELECTION_STATUS }, { key: 'votingStart', label: 'شروع رأی‌گیری', kind: 'date' }, { key: 'seats', label: 'کرسی' }],
    fields: [
      { name: 'title', label: 'عنوان', type: 'text', required: true, wide: true },
      { name: 'associationYear', label: 'انجمنِ سال', type: 'select', source: 'associationYears', required: true },
      { name: 'status', label: 'مرحله', type: 'select', options: opts(ELECTION_STATUS), required: true },
      { name: 'candidacyStart', label: 'شروع ثبت‌نام نامزدها', type: 'datetime' },
      { name: 'candidacyEnd', label: 'پایان ثبت‌نام نامزدها', type: 'datetime' },
      { name: 'votingStart', label: 'شروع رأی‌گیری', type: 'datetime' },
      { name: 'votingEnd', label: 'پایان رأی‌گیری', type: 'datetime' },
      { name: 'seats', label: 'تعداد کرسی‌ها', type: 'number', required: true },
      { name: 'maxChoicesPerVoter', label: 'حداکثر انتخاب هر رأی‌دهنده', type: 'number', required: true },
      { name: 'description', label: 'توضیحات و قوانین', type: 'textarea', wide: true },
    ],
  },
  candidates: {
    entity: 'candidates', title: 'نامزدها', singular: 'نامزد', search: ['fullName', 'studentNumber'], defaults: { status: 'Pending' },
    columns: [{ key: 'fullName', label: 'نام' }, { key: 'studentNumber', label: 'شماره دانشجویی' }, { key: 'election', label: 'انتخابات', kind: 'lookup', source: 'elections' }, { key: 'status', label: 'وضعیت', kind: 'label', map: CANDIDATE_STATUS }],
    fields: [
      { name: 'election', label: 'انتخابات', type: 'select', source: 'elections', required: true, wide: true },
      { name: 'fullName', label: 'نام و نام خانوادگی', type: 'text', required: true },
      { name: 'studentNumber', label: 'شماره دانشجویی', type: 'text', required: true, dir: 'ltr' },
      { name: 'status', label: 'وضعیت بررسی', type: 'select', options: opts(CANDIDATE_STATUS), required: true },
      { name: 'photoUrl', label: 'عکس', type: 'image' },
      { name: 'statement', label: 'برنامه/بیانیه نامزد', type: 'textarea', wide: true },
      { name: 'reviewNote', label: 'یادداشت بررسی (داخلی)', type: 'textarea', wide: true },
    ],
  },
  voters: {
    entity: 'voters', title: 'واجدین رأی', singular: 'رأی‌دهنده', search: ['studentNumber', 'fullName', 'majorName'],
    columns: [{ key: 'studentNumber', label: 'شماره دانشجویی' }, { key: 'fullName', label: 'نام' }, { key: 'majorName', label: 'رشته' }, { key: 'election', label: 'انتخابات', kind: 'lookup', source: 'elections' }, { key: 'nationalIdLast4', label: '۴ رقم آخر کد ملی' }],
    fields: [
      { name: 'election', label: 'انتخابات', type: 'select', source: 'elections', required: true, wide: true },
      { name: 'studentNumber', label: 'شماره دانشجویی', type: 'text', required: true, dir: 'ltr' },
      { name: 'nationalId', label: 'کد ملی', type: 'text', dir: 'ltr', hint: 'فقط به‌صورت رمزنگاری‌شده ذخیره می‌شود؛ در ویرایش، خالی بماند تا تغییر نکند' },
      { name: 'fullName', label: 'نام', type: 'text' },
      { name: 'majorName', label: 'رشته', type: 'text' },
    ],
  },
  years: {
    entity: 'years', title: 'سال‌های تحصیلی', singular: 'سال تحصیلی', search: ['title'], defaults: { status: 'Upcoming' },
    columns: [{ key: 'title', label: 'عنوان' }, { key: 'status', label: 'وضعیت', kind: 'label', map: YEAR_STATUS }, { key: 'sortOrder', label: 'ترتیب' }],
    fields: [
      { name: 'title', label: 'عنوان (مثلاً ۱۴۰۵-۱۴۰۶)', type: 'text', required: true },
      { name: 'status', label: 'وضعیت', type: 'select', options: opts(YEAR_STATUS), required: true },
      { name: 'sortOrder', label: 'ترتیب (سال شروع، مثلاً 1405)', type: 'number' },
    ],
  },
  associationYears: {
    entity: 'associationYears', title: 'انجمن‌های هر سال', singular: 'انجمنِ سال', search: ['title'], defaults: { active: true, needsUniversityApproval: false },
    columns: [{ key: 'title', label: 'عنوان' }, { key: 'academicYear', label: 'سال', kind: 'lookup', source: 'years' }, { key: 'needsUniversityApproval', label: 'نیازمند تأیید', kind: 'bool' }, { key: 'active', label: 'فعال', kind: 'bool' }],
    fields: [
      { name: 'association', label: 'انجمن', type: 'select', source: 'associations', required: true },
      { name: 'academicYear', label: 'سال تحصیلی', type: 'select', source: 'years', required: true },
      { name: 'needsUniversityApproval', label: 'نیازمند تأیید دانشگاه', type: 'checkbox' },
      { name: 'active', label: 'فعال', type: 'checkbox' },
      { name: 'notes', label: 'یادداشت', type: 'textarea', wide: true },
    ],
  },
  associationMajors: {
    entity: 'associationMajors', title: 'نگاشت رشته به انجمن', singular: 'نگاشت', search: ['label'], defaults: { needsUniversityApproval: false },
    columns: [{ key: 'label', label: 'نگاشت' }, { key: 'associationYear', label: 'انجمنِ سال', kind: 'lookup', source: 'associationYears' }, { key: 'major', label: 'رشته', kind: 'lookup', source: 'majors' }, { key: 'needsUniversityApproval', label: 'نیازمند تأیید', kind: 'bool' }],
    fields: [
      { name: 'associationYear', label: 'انجمنِ سال (رأی‌دهندگان این رشته در انتخابات این انجمن رأی می‌دهند)', type: 'select', source: 'associationYears', required: true, wide: true },
      { name: 'major', label: 'رشته', type: 'select', source: 'majors', required: true },
      { name: 'needsUniversityApproval', label: 'نیازمند تأیید دانشگاه', type: 'checkbox' },
    ],
  },
  positions: {
    entity: 'positions', title: 'سمت‌ها', singular: 'سمت', search: ['name'], defaults: { scope: 'Association' },
    columns: [{ key: 'name', label: 'نام' }, { key: 'scope', label: 'سطح', kind: 'label', map: SCOPE }, { key: 'rank', label: 'رتبه' }],
    fields: [
      { name: 'name', label: 'نام سمت', type: 'text', required: true },
      { name: 'scope', label: 'سطح', type: 'select', options: opts(SCOPE), required: true },
      { name: 'rank', label: 'رتبه نمایش', type: 'number' },
    ],
  },
  terms: {
    entity: 'terms', title: 'دوره‌های مسئولیت', singular: 'دوره مسئولیت', search: ['label', 'personName'], defaults: { status: 'Undetermined', publishName: false },
    columns: [{ key: 'label', label: 'عنوان' }, { key: 'personName', label: 'فرد' }, { key: 'position', label: 'سمت', kind: 'lookup', source: 'positions' }, { key: 'status', label: 'وضعیت', kind: 'label', map: TERM_STATUS }, { key: 'publishName', label: 'انتشار نام', kind: 'bool' }],
    fields: [
      { name: 'position', label: 'سمت', type: 'select', source: 'positions', required: true },
      { name: 'academicYear', label: 'سال تحصیلی', type: 'select', source: 'years', required: true },
      { name: 'associationYear', label: 'انجمنِ سال (برای دبیر دبیران خالی بماند)', type: 'select', source: 'associationYears', wide: true },
      { name: 'personName', label: 'نام فرد', type: 'text' },
      { name: 'personEmail', label: 'ایمیل فرد', type: 'email', dir: 'ltr' },
      { name: 'status', label: 'وضعیت', type: 'select', options: opts(TERM_STATUS), required: true },
      { name: 'startDate', label: 'تاریخ شروع', type: 'datetime' },
      { name: 'endDate', label: 'تاریخ پایان', type: 'datetime' },
      { name: 'publishName', label: 'انتشار نام در صفحه عمومی (فقط با رضایت فرد)', type: 'checkbox', wide: true },
      { name: 'notes', label: 'یادداشت', type: 'textarea', wide: true },
    ],
  },

  news: {
    entity: 'news', title: 'اخبار و اطلاعیه‌ها', singular: 'خبر', search: ['title', 'excerpt'],
    defaults: { status: 'Draft', featured: false, isAnnouncement: false },
    columns: [{ key: 'title', label: 'عنوان' }, { key: 'category', label: 'دسته', kind: 'lookup', source: 'categories' }, { key: 'status', label: 'وضعیت', kind: 'status' }, { key: 'publishAt', label: 'زمان انتشار', kind: 'date' }],
    fields: [
      { name: 'title', label: 'عنوان', type: 'text', required: true, wide: true },
      { name: 'slug', label: 'نشانی (slug)', type: 'text', hint: 'خالی بماند تا از عنوان ساخته شود', dir: 'ltr' },
      { name: 'category', label: 'دسته‌بندی', type: 'select', source: 'categories' },
      { name: 'association', label: 'انجمن', type: 'select', source: 'associations' },
      { name: 'status', label: 'وضعیت انتشار', type: 'select', options: statusOpts, required: true },
      { name: 'publishAt', label: 'زمان انتشار', type: 'datetime', hint: 'برای انتشار زمان‌بندی‌شده، زمان آینده انتخاب کنید' },
      { name: 'coverUrl', label: 'تصویر شاخص', type: 'image', wide: true },
      { name: 'excerpt', label: 'خلاصه', type: 'textarea', wide: true },
      { name: 'body', label: 'متن خبر (Markdown)', type: 'markdown', wide: true },
      { name: 'isAnnouncement', label: 'اطلاعیه رسمی', type: 'checkbox' },
      { name: 'featured', label: 'ویژه در صفحه اصلی', type: 'checkbox' },
    ],
  },
  events: {
    entity: 'events', title: 'رویدادها و دوره‌ها', singular: 'رویداد', search: ['title', 'location'],
    defaults: { status: 'Draft', kind: 'Event', featured: false },
    columns: [{ key: 'title', label: 'عنوان' }, { key: 'kind', label: 'نوع', kind: 'label', map: KIND_LABEL }, { key: 'startAt', label: 'شروع', kind: 'date' }, { key: 'status', label: 'وضعیت', kind: 'status' }],
    fields: [
      { name: 'title', label: 'عنوان', type: 'text', required: true, wide: true },
      { name: 'kind', label: 'نوع', type: 'select', options: opts(KIND_LABEL), required: true },
      { name: 'status', label: 'وضعیت', type: 'select', options: statusOpts, required: true },
      { name: 'startAt', label: 'زمان شروع', type: 'datetime', required: true },
      { name: 'endAt', label: 'زمان پایان', type: 'datetime' },
      { name: 'location', label: 'مکان', type: 'text' },
      { name: 'association', label: 'انجمن برگزارکننده', type: 'select', source: 'associations' },
      { name: 'registrationUrl', label: 'لینک ثبت‌نام', type: 'url', dir: 'ltr' },
      { name: 'slug', label: 'نشانی (slug)', type: 'text', dir: 'ltr' },
      { name: 'coverUrl', label: 'تصویر', type: 'image', wide: true },
      { name: 'summary', label: 'خلاصه', type: 'textarea', wide: true },
      { name: 'body', label: 'توضیحات (Markdown)', type: 'markdown', wide: true },
      { name: 'featured', label: 'ویژه', type: 'checkbox' },
    ],
  },
  associations: {
    entity: 'associations', title: 'انجمن‌های علمی', singular: 'انجمن', search: ['name', 'shortDescription'],
    defaults: { active: true, featured: false },
    columns: [{ key: 'name', label: 'نام' }, { key: 'faculty', label: 'دانشکده', kind: 'lookup', source: 'faculties' }, { key: 'major', label: 'رشته', kind: 'lookup', source: 'majors' }, { key: 'active', label: 'فعال', kind: 'bool' }],
    fields: [
      { name: 'name', label: 'نام انجمن', type: 'text', required: true, wide: true },
      { name: 'faculty', label: 'دانشکده', type: 'select', source: 'faculties' },
      { name: 'major', label: 'رشته', type: 'select', source: 'majors' },
      { name: 'slug', label: 'نشانی (slug)', type: 'text', dir: 'ltr' },
      { name: 'contactEmail', label: 'ایمیل', type: 'email', dir: 'ltr' },
      { name: 'telegramUrl', label: 'کانال تلگرام', type: 'url', dir: 'ltr' },
      { name: 'shortDescription', label: 'معرفی کوتاه', type: 'text', wide: true },
      { name: 'logoUrl', label: 'لوگو', type: 'image' },
      { name: 'coverUrl', label: 'تصویر کاور', type: 'image' },
      { name: 'about', label: 'درباره انجمن (Markdown)', type: 'markdown', wide: true },
      { name: 'active', label: 'فعال', type: 'checkbox' },
      { name: 'featured', label: 'منتخب', type: 'checkbox' },
    ],
  },
  faculties: {
    entity: 'faculties', title: 'دانشکده‌ها', singular: 'دانشکده', search: ['name'], defaults: { active: true, verified: false },
    columns: [{ key: 'name', label: 'نام' }, { key: 'sortOrder', label: 'ترتیب' }, { key: 'verified', label: 'تأییدشده', kind: 'bool' }, { key: 'active', label: 'فعال', kind: 'bool' }],
    fields: [
      { name: 'name', label: 'نام دانشکده', type: 'text', required: true, wide: true },
      { name: 'slug', label: 'نشانی (slug)', type: 'text', dir: 'ltr' },
      { name: 'sortOrder', label: 'ترتیب نمایش', type: 'number' },
      { name: 'imageUrl', label: 'تصویر', type: 'image', wide: true },
      { name: 'description', label: 'توضیحات', type: 'textarea', wide: true },
      { name: 'active', label: 'فعال', type: 'checkbox' },
      { name: 'verified', label: 'تطبیق با اطلاعات رسمی', type: 'checkbox' },
    ],
  },
  majors: {
    entity: 'majors', title: 'رشته‌ها', singular: 'رشته', search: ['name'], defaults: { active: true, verified: false },
    columns: [{ key: 'name', label: 'نام' }, { key: 'faculty', label: 'دانشکده', kind: 'lookup', source: 'faculties' }, { key: 'verified', label: 'تأییدشده', kind: 'bool' }, { key: 'active', label: 'فعال', kind: 'bool' }],
    fields: [
      { name: 'name', label: 'نام رشته', type: 'text', required: true },
      { name: 'faculty', label: 'دانشکده', type: 'select', source: 'faculties', required: true },
      { name: 'description', label: 'توضیحات', type: 'textarea', wide: true },
      { name: 'active', label: 'فعال', type: 'checkbox' },
      { name: 'verified', label: 'تطبیق با اطلاعات رسمی', type: 'checkbox' },
    ],
  },
  categories: {
    entity: 'categories', title: 'دسته‌بندی‌ها', singular: 'دسته', search: ['name'],
    columns: [{ key: 'name', label: 'نام' }, { key: 'slug', label: 'نشانی' }],
    fields: [{ name: 'name', label: 'نام', type: 'text', required: true }, { name: 'slug', label: 'نشانی (slug)', type: 'text', dir: 'ltr' }],
  },
  media: {
    entity: 'media', title: 'رسانه‌ها', singular: 'فایل', search: ['title', 'source'],
    columns: [{ key: 'title', label: 'عنوان' }, { key: 'license', label: 'مجوز' }, { key: 'uploadedAt', label: 'تاریخ', kind: 'date' }],
    fields: [
      { name: 'title', label: 'عنوان', type: 'text', required: true },
      { name: 'fileUrl', label: 'فایل', type: 'image', required: true, wide: true },
      { name: 'altText', label: 'متن جایگزین (Alt)', type: 'text', wide: true },
      { name: 'source', label: 'منبع', type: 'text' },
      { name: 'license', label: 'مجوز استفاده', type: 'text' },
    ],
  },
  members: {
    entity: 'members', title: 'کاربران و نقش‌ها', singular: 'نقش', search: ['email', 'label'], defaults: { active: true, role: 'Content Editor' },
    columns: [{ key: 'email', label: 'ایمیل' }, { key: 'role', label: 'نقش', kind: 'label', map: ROLE_LABEL }, { key: 'association', label: 'انجمن', kind: 'lookup', source: 'associations' }, { key: 'active', label: 'فعال', kind: 'bool' }],
    fields: [
      { name: 'email', label: 'ایمیل کاربر', type: 'email', required: true, dir: 'ltr', hint: 'کاربر باید حداقل یک‌بار وارد سامانه شده باشد' },
      { name: 'role', label: 'نقش', type: 'select', options: opts(ROLE_LABEL), required: true },
      { name: 'association', label: 'انجمن (برای مدیر انجمن)', type: 'select', source: 'associations' },
      { name: 'active', label: 'فعال', type: 'checkbox' },
    ],
  },
};
