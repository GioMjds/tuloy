import {
  ListOrdered,
  Package,
  QrCode,
  Settings,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = { href: string; labelKey: string; icon: LucideIcon };

export const navByVariant: Record<'owner' | 'admin', NavItem[]> = {
  owner: [
    { href: '/dashboard', labelKey: 'nav.queue', icon: ListOrdered },
    { href: '/dashboard/services', labelKey: 'nav.services', icon: Package },
    { href: '/dashboard/share', labelKey: 'nav.share', icon: QrCode },
    { href: '/dashboard/settings', labelKey: 'nav.settings', icon: Settings },
  ],
  admin: [
    { href: '/admin', labelKey: 'nav.shops', icon: Store },
    { href: '/admin/owners', labelKey: 'nav.owners', icon: Users },
  ],
};

// Roots must match exactly; deeper routes match by prefix.
export const isActive = (pathname: string, href: string) =>
  href === '/dashboard' || href === '/admin'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
