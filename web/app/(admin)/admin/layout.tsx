import { DashboardShell } from '@/components/layout/dashboard-shell';
import { requireSession } from '@/lib/auth/session';
import { SessionProvider } from '@/stores/session-store';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession('SUPER_ADMIN');
  return (
    <SessionProvider initialUser={user}>
      <DashboardShell variant="admin">{children}</DashboardShell>
    </SessionProvider>
  );
}
