import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Admin | TurtleTalk', template: '%s | Admin | TurtleTalk' },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/parent');

  return (
    <div className="parent-dashboard" style={{ minHeight: '100vh', background: 'var(--pd-bg-gradient)' }}>
      {children}
    </div>
  );
}
