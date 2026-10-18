import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminDemoData } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { errMsg, faNum } from '../lib/format';

const PHRASE = 'حذف داده نمایشی';

/** Super Admin only: removes every isDemo record in one confirmed action. */
export default function DemoDataCard() {
  const qc = useQueryClient();
  const count = useQuery({ queryKey: ['admin', 'demo'], queryFn: () => adminDemoData({ action: 'count' }) });
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const remove = useMutation({
    mutationFn: () => adminDemoData({ action: 'remove', confirm: text }),
    onSuccess: (r) => { toast.success(`${faNum(r.removed)} رکورد نمایشی حذف شد.`); setOpen(false); setText(''); qc.invalidateQueries(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const total = count.data?.total ?? 0;
  if (!count.isLoading && total === 0) return null;
  return (
    <div className="rounded-2xl border border-accent/50 bg-accent/10 p-5">
      <h2 className="flex items-center gap-2 font-bold"><FlaskConical className="h-5 w-5" aria-hidden />داده‌ی نمایشی</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{count.isLoading ? 'در حال شمارش…' : `${faNum(total)} رکورد ساختگی برای پیش‌نمایش وجود دارد. پیش از استفاده‌ی واقعی آن‌ها را حذف کنید.`}</p>
      <Button variant="destructive" size="sm" className="mt-3" disabled={!total} onClick={() => setOpen(true)}>حذف همه‌ی داده‌ی نمایشی</Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف {faNum(total)} رکورد نمایشی؟</AlertDialogTitle>
            <AlertDialogDescription>فقط رکوردهای علامت‌خورده با «نمایشی» حذف می‌شوند و داده‌ی واقعی دست نمی‌خورد. برای تأیید عبارت «{PHRASE}» را بنویسید.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={text} onChange={(e) => setText(e.target.value)} aria-label="عبارت تأیید" />
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <Button variant="destructive" disabled={text !== PHRASE || remove.isPending} onClick={() => remove.mutate()}>
              {remove.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}حذف
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
