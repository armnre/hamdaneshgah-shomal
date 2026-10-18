import { useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { ArrowUpDown, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminList, adminSave, adminDelete } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Badge } from '@project/components/ui/badge';
import { Skeleton } from '@project/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@project/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { RESOURCES, Column } from './resources';
import { useAccess, useOptions } from './AdminApp';
import FormSheet from './FormSheet';
import { EmptyState, ErrorState, Pagination } from '../components/site/ui';
import { errMsg, faDate, faNum, STATUS_LABEL } from '../lib/format';

type Row = Record<string, unknown>;
const PAGE = 15;
const STATUS_STYLE: Record<string, string> = { Published: 'bg-primary/10 text-primary', Draft: 'bg-muted text-muted-foreground', Archived: 'bg-accent/15 text-accent-foreground' };

export default function ResourcePage() {
  const { entity = '' } = useParams();
  const res = RESOURCES[entity];
  const access = useAccess();
  if (!res || !access.entities.includes(res.entity)) return <Navigate to="/admin" replace />;
  return <ResourceInner key={entity} entity={entity} />;
}

function ResourceInner({ entity }: { entity: string }) {
  const res = RESOURCES[entity];
  const access = useAccess();
  const qc = useQueryClient();
  const opts = useOptions().data as Record<string, { id: string; name: string }[]> | undefined;
  const q = useQuery({ queryKey: ['admin', entity], queryFn: () => adminList({ entity: res.entity }) });
  const [search, setSearch] = useState('');
  const [ds] = useDebounce(search, 250);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const rows = useMemo(() => {
    let r = ((q.data?.rows as Row[]) ?? []).filter((x) => !ds || res.search.some((k) => String(x[k] ?? '').toLowerCase().includes(ds.toLowerCase())));
    if (sort) r = [...r].sort((a, b) => String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? ''), 'fa') * sort.dir);
    return r;
  }, [q.data, ds, sort, res]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const pageRows = rows.slice((page - 1) * PAGE, page * PAGE);

  const save = useMutation({
    mutationFn: (data: Row) => adminSave({ entity: res.entity, id: editing?.id as string | undefined, data }),
    onSuccess: () => { toast.success('ذخیره شد'); setFormOpen(false); qc.invalidateQueries({ queryKey: ['admin'] }); qc.invalidateQueries({ queryKey: ['adminOptions'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => adminDelete({ entity: res.entity, id }),
    onSuccess: () => { toast.success('حذف شد'); qc.invalidateQueries({ queryKey: ['admin'] }); qc.invalidateQueries({ queryKey: ['adminOptions'] }); },
    onError: (e) => toast.error(errMsg(e)),
    onSettled: () => setToDelete(null),
  });

  const cell = (c: Column, r: Row) => {
    const v = r[c.key];
    if (c.kind === 'date') return faDate(v);
    if (c.kind === 'bool') return v ? <Badge variant="secondary">بله</Badge> : <span className="text-muted-foreground">خیر</span>;
    if (c.kind === 'status') return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[String(v)] ?? ''}`}>{STATUS_LABEL[String(v)] ?? '—'}</span>;
    if (c.kind === 'lookup') return opts?.[c.source!]?.find((o) => o.id === v)?.name ?? '—';
    if (c.kind === 'label') return c.map?.[String(v)] ?? String(v ?? '—');
    return String(v ?? '—');
  };
  const canCreate = !(access.role === 'Association Manager' && res.entity === 'associations');
  const canDelete = !(access.role === 'Association Manager' && res.entity === 'associations');
  const openEdit = (r: Row | null) => { setEditing(r); setFormOpen(true); };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">{res.title}</h1><p className="text-sm text-muted-foreground">{faNum(rows.length)} مورد</p></div>
        {canCreate && <Button onClick={() => openEdit(null)}><Plus className="ml-1.5 h-4 w-4" />{res.singular} جدید</Button>}
      </div>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="جست‌وجو…" className="bg-card pr-10" aria-label="جست‌وجو" />
      </div>
      {q.isError ? <ErrorState text={errMsg(q.error)} onRetry={() => q.refetch()} /> : q.isLoading ? <Skeleton className="h-80 rounded-2xl" /> : rows.length === 0 ? (
        <EmptyState title={search ? 'نتیجه‌ای یافت نشد' : `هنوز ${res.singular}ی ثبت نشده`} action={canCreate && !search ? <Button onClick={() => openEdit(null)}><Plus className="ml-1.5 h-4 w-4" />افزودن</Button> : undefined} />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
            <Table>
              <TableHeader><TableRow>
                {res.columns.map((c) => (
                  <TableHead key={c.key} className="text-right">
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))}>{c.label}<ArrowUpDown className="h-3 w-3" /></button>
                  </TableHead>
                ))}
                <TableHead className="w-24" />
              </TableRow></TableHeader>
              <TableBody>{pageRows.map((r) => (
                <TableRow key={String(r.id)}>
                  {res.columns.map((c, i) => <TableCell key={c.key} className={i === 0 ? 'max-w-xs truncate font-semibold' : ''}>{cell(c, r)}</TableCell>)}
                  <TableCell><div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="ویرایش"><Pencil className="h-4 w-4" /></Button>
                    {canDelete && <Button variant="ghost" size="icon" onClick={() => setToDelete(r)} aria-label="حذف"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </div></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:hidden">{pageRows.map((r) => (
            <div key={String(r.id)} className="rounded-2xl border bg-card p-4">
              <p className="font-bold">{cell(res.columns[0], r)}</p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">{res.columns.slice(1).map((c) => <div key={c.key}><dt className="text-muted-foreground">{c.label}</dt><dd className="mt-0.5">{cell(c, r)}</dd></div>)}</dl>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil className="ml-1 h-3.5 w-3.5" />ویرایش</Button>
                {canDelete && <Button size="sm" variant="outline" onClick={() => setToDelete(r)}><Trash2 className="ml-1 h-3.5 w-3.5 text-destructive" />حذف</Button>}
              </div>
            </div>
          ))}</div>
          <Pagination page={page} pages={pages} onChange={setPage} />
        </>
      )}
      <FormSheet res={res} open={formOpen} initial={editing} onClose={() => setFormOpen(false)} onSave={(d) => save.mutate(d)} saving={save.isPending} />
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>حذف {res.singular}</AlertDialogTitle><AlertDialogDescription>«{String(toDelete?.title ?? toDelete?.name ?? toDelete?.email ?? '')}» برای همیشه حذف می‌شود. این عمل در گزارش رخدادها ثبت خواهد شد.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel>انصراف</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); del.mutate(String(toDelete!.id)); }} disabled={del.isPending}>حذف</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
