import { observable, action, makeObservable } from 'mobx'
import dayjs from 'dayjs'
import zhCN from 'dayjs/locale/zh-cn'
import zhTW from 'dayjs/locale/zh-tw'
import { Locale, TranslationKeys } from './types'
import { locales } from './locales'

// dayjs locale 映射
const dayjsLocaleMap: Record<Locale, string> = {
  'zh-CN': 'zh-cn',
  'zh-TW': 'zh-tw',
  en: 'en',
}

// 預先載入所有 locale
dayjs.locale(zhCN)
dayjs.locale(zhTW)

type TranslationParams = Record<string, string | number>

class I18nStore {
  private static STORAGE_KEY = 'app-locale'

  @observable accessor locale: Locale = 'zh-CN'

  constructor() {
    makeObservable(this)
    this.initLocale()
  }

  private initLocale() {
    // 1. 優先讀取 localStorage
    const saved = localStorage.getItem(I18nStore.STORAGE_KEY)
    if (saved && this.isValidLocale(saved)) {
      this.setLocale(saved as Locale)
      return
    }

    // 2. 根據瀏覽器語言自動檢測
    const browserLang = navigator.language
    if (browserLang === 'zh-TW' || browserLang === 'zh-HK') {
      this.setLocale('zh-TW')
    } else if (browserLang.startsWith('zh')) {
      this.setLocale('zh-CN')
    } else {
      this.setLocale('en')
    }
  }

  private isValidLocale(locale: string): locale is Locale {
    return locale === 'zh-CN' || locale === 'zh-TW' || locale === 'en'
  }

  @action
  setLocale(locale: Locale) {
    this.locale = locale
    localStorage.setItem(I18nStore.STORAGE_KEY, locale)

    // 同步 dayjs locale
    dayjs.locale(dayjsLocaleMap[locale])
  }

  /**
   * 獲取翻譯文字
   * @param namespace 命名空間（如 'common', 'home'）
   * @param key 翻譯鍵
   * @param params 參數（用於替換 {param} 佔位符）
   */
  t = <N extends keyof TranslationKeys>(
    namespace: N,
    key: keyof TranslationKeys[N],
    params?: TranslationParams,
  ): string => {
    const text = locales[this.locale][namespace][key] as string

    if (!params) {
      return text
    }

    // 替換 {param} 佔位符
    return Object.entries(params).reduce(
      (result, [k, v]) => result.replace(`{${k}}`, String(v)),
      text,
    )
  }
}

export const i18nStore = new I18nStore()
