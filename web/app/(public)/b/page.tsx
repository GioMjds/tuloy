import { notFound, redirect } from 'next/navigation';

// Target of the homepage shop code form; normalizes input into a shop slug.
export default async function ShopCodeRedirect({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string | string[] }>;
}) {
  const raw = (await searchParams).slug;
  const slug = (typeof raw === 'string' ? raw : '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) notFound();
  redirect(`/b/${slug}`);
}
