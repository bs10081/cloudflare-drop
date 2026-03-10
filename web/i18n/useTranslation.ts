import { i18nStore } from './store'
import { Locale, TranslationKeys } from './types'

type TranslationParams = Record<string, string | number>

export function useTranslation() {
  const t = <N extends keyof TranslationKeys>(
    namespace: N,
    key: keyof TranslationKeys[N],
    params?: TranslationParams,
  ): string => {
    return i18nStore.t(namespace, key, params)
  }

  return {
    t,
    locale: i18nStore.locale,
    setLocale: (locale: Locale) => i18nStore.setLocale(locale),
  }
}
