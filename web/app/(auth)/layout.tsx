import { AuthShell } from '@/components/layout/auth-shell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
