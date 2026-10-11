'use client';
import { useTranslations } from 'next-intl';
import { useFormField } from '@/components/ui/form';

export function FormMessageT() {
  const t = useTranslations();
  const { error, formMessageId } = useFormField();
  if (!error?.message) return null;
  return (
    <p id={formMessageId} className="text-sm text-destructive">
      {t(error.message as never)}
    </p>
  );
}
