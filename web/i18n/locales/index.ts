import { Locale, TranslationKeys } from '../types'
import { zhCN } from './zh-CN'
import { zhTW } from './zh-TW'
import { en } from './en'

export const locales: Record<Locale, TranslationKeys> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en: en,
}
