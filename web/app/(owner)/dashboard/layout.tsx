import { DashboardShell } from '@/components/layout/dashboard-shell';
import { requireSession } from '@/lib/auth/session';
import { SessionProvider } from '@/stores/session-store';

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession('OWNER');
  return (
    <SessionProvider initialUser={user}>
      <DashboardShell variant="owner">{children}</DashboardShell>
    </SessionProvider>
  );
}
