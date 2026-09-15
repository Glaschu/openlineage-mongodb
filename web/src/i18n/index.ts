// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0
//
// Minimal stand-in for i18next + react-i18next + the browser language
// detector (~120 kB on every page load, ~24 kB gzipped).
//
// It covers exactly what this app uses: dotted-key lookup against
// ./resources, a persisted language choice, and fallback to English. The
// language switcher in the Sidenav reloads the page after changing language,
// so the active language is resolved once at module load rather than being
// reactive.
//
// If translations ever need interpolation, plurals or namespaces, bring
// i18next back rather than growing this file.

import { defaultNS, resources } from './resources'

export type Language = keyof typeof resources

const FALLBACK_LANGUAGE: Language = 'en'
const STORAGE_KEY = 'lng'

export const languages = Object.keys(resources) as Language[]

const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (languages as string[]).includes(value)

// localStorage throws in some privacy modes, and is absent in some test envs.
const readStoredLanguage = (): Language | undefined => {
  try {
    const stored = window.localStorage?.getItem(STORAGE_KEY)
    return isLanguage(stored) ? stored : undefined
  } catch {
    return undefined
  }
}

let resolvedLanguage: Language = readStoredLanguage() ?? FALLBACK_LANGUAGE

const lookup = (language: Language, key: string): string | undefined => {
  const value = key
    .split('.')
    .reduce<unknown>(
      (branch, part) =>
        branch && typeof branch === 'object'
          ? (branch as Record<string, unknown>)[part]
          : undefined,
      resources[language]?.translation
    )

  return typeof value === 'string' ? value : undefined
}

/**
 * Resolves a dotted key, e.g. t('jobs.latest_tab'), against the active
 * language, then English. Unknown keys come back as the key itself, which is
 * what i18next did.
 */
export const t = (key: string): string =>
  lookup(resolvedLanguage, key) ?? lookup(FALLBACK_LANGUAGE, key) ?? key

export const changeLanguage = (language: string) => {
  if (!isLanguage(language)) return
  resolvedLanguage = language
  try {
    window.localStorage?.setItem(STORAGE_KEY, language)
  } catch {
    // Persisting is best effort; the change still applies for this session.
  }
}

export const i18n = {
  get resolvedLanguage() {
    return resolvedLanguage
  },
  languages,
  changeLanguage,
}

export const useTranslation = () => ({ t, i18n })

export { defaultNS, resources }
