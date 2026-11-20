import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { serverFetch } from '@/lib/api-server';
import { ApiError } from '@/lib/api-error';
import { businessSchema } from '@/lib/endpoints/businesses';

export default async function ShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await serverFetch(`/businesses/${slug}`, {
    schema: businessSchema,
  }).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  return <PageHeader title={shop.name} />;
}
