'use client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function CopyButton({ value }: { value: string }) {
  const t = useTranslations('share');
  return (
    <Button
      type="button"
      className="h-12 text-base"
      onClick={() =>
        navigator.clipboard
          .writeText(value)
          .then(() => toast.success(t('copied')))
          .catch(() => toast.error(t('copyFailed')))
      }
    >
      {t('copy')}
    </Button>
  );
}
