'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

export default function LanguageSwitcher() {
  const locale   = useLocale();
  const router   = useRouter();
  const pathname = usePathname();
  const isAr     = locale === 'ar';

  function switchLanguage() {
    const next    = isAr ? 'en' : 'ar';
    const newPath = pathname.replace(/^\/(ar|en)/, `/${next}`);
    router.push(newPath);
  }

  return (
    <div className="flex gap-[2px] p-[3px] rounded-full border border-[#E6EBF1] bg-white/80 backdrop-blur-[8px]">
      <button
        type="button"
        onClick={!isAr ? undefined : switchLanguage}
        className={`text-[13px] font-semibold px-[14px] py-[6px] rounded-full transition-all duration-200 ${
          !isAr ? 'bg-[#0C1521] text-white' : 'text-[#7A8794] hover:text-[#0C1521]'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={isAr ? undefined : switchLanguage}
        className={`text-[13px] font-semibold px-[14px] py-[6px] rounded-full transition-all duration-200 ${
          isAr ? 'bg-[#0C1521] text-white' : 'text-[#7A8794] hover:text-[#0C1521]'
        }`}
      >
        عربية
      </button>
    </div>
  );
}
