'use client';

import { useTranslations } from 'next-intl';
import PhoneInput, { COUNTRY_CODE } from '@/components/ui/PhoneInput';

type Props = {
  t: ReturnType<typeof useTranslations<'auth'>>;
};

export default function PhoneField({ t }: Props) {
  return (
    <PhoneInput
      label={t('phone')}
      placeholder={t('phonePlaceholder')}
      phoneName="phone_local"
      countryCodeName="country_code"
      autoFocus
    />
  );
}

export { COUNTRY_CODE };
