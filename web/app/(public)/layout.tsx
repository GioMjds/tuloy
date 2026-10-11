import { PublicShell } from '@/components/layout/public-shell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
