import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

const LanguageSwitcher = () => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [showDropdown, setShowDropdown] = useState(false);

  const languages = [
    { code: 'en', name: t('languages.en'), flag: '🇬🇧' },
    { code: 'hi', name: t('languages.hi'), flag: '🇮🇳' },
    { code: 'ta', name: t('languages.ta'), flag: '🇮🇳' },
    { code: 'id', name: t('languages.id'), flag: '🇮🇩' },
  ];

  const currentLanguage = languages.find(lang => lang.code === router.locale) || languages[0];

  const changeLanguage = (locale: string) => {
    router.push(router.pathname, router.asPath, { locale });
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
      >
        <span className="text-xl">{currentLanguage.flag}</span>
        <span className="font-medium text-gray-800">{currentLanguage.code.toUpperCase()}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
            <div className="p-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${
                    router.locale === lang.code
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                  {router.locale === lang.code && (
                    <svg className="w-5 h-5 ml-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;