import { i18nStore } from '../i18n/store'
import { TranslationKeys } from '../i18n/types'

/**
 * 將後端返回的錯誤碼（如 INVALID_CODE）轉換為 camelCase（如 invalidCode）
 */
function toCamelCase(str: string): string {
  return str
    .split('_')
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join('')
}

/**
 * 將後端返回的錯誤訊息映射到 i18n 翻譯
 * @param errorMessage 後端返回的錯誤訊息（可能是錯誤碼如 INVALID_CODE 或其他訊息）
 * @returns i18n 翻譯後的錯誤訊息
 */
export function mapError(errorMessage: string): string {
  // 如果錯誤訊息是全大寫或包含底線，可能是錯誤碼
  if (/^[A-Z_]+$/.test(errorMessage)) {
    const camelCaseKey = toCamelCase(errorMessage)

    // 嘗試從 i18n errors 區塊獲取翻譯
    try {
      const translated = i18nStore.t(
        'errors',
        camelCaseKey as keyof TranslationKeys['errors'],
      )
      if (translated) {
        return translated
      }
    } catch (_e) {
      // 如果找不到翻譯，返回 unknownError
      return i18nStore.t('errors', 'unknownError')
    }
  }

  // 如果不是錯誤碼格式，直接返回原始訊息（向後兼容）
  return errorMessage || i18nStore.t('errors', 'unknownError')
}
