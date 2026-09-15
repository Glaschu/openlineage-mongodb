import { beforeEach, describe, expect, it, vi } from 'vitest'

// The global test setup mocks '@/i18n' so components assert on keys; these
// tests exercise the real module.
type I18nModule = typeof import('./index')

const loadI18n = async (): Promise<I18nModule> => {
  vi.resetModules()
  return vi.importActual<I18nModule>('./index')
}

describe('i18n', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('resolves nested keys in the default language', async () => {
    const { t } = await loadI18n()
    expect(t('jobs.latest_tab')).toBe('LATEST RUN')
  })

  it('returns the key itself when it is unknown', async () => {
    const { t } = await loadI18n()
    expect(t('nope.not_a_key')).toBe('nope.not_a_key')
    expect(t('jobs')).toBe('jobs') // a branch, not a leaf
  })

  it('uses the language stored by a previous session', async () => {
    window.localStorage.setItem('lng', 'fr')
    const { t, i18n } = await loadI18n()
    expect(i18n.resolvedLanguage).toBe('fr')
    expect(t('jobs.latest_tab')).toBe('DERNIÈRE COURSE')
  })

  it('falls back to English for keys a locale is missing', async () => {
    window.localStorage.setItem('lng', 'pl')
    const { t } = await loadI18n()
    // Polish has no translation for these keys; i18next fell back to English too.
    expect(t('lineage.full_graph_label')).toBe('Full')
    // ...while keys Polish does have still come back translated.
    expect(t('jobs.latest_tab')).not.toBe('LATEST RUN')
  })

  it('ignores a stored language it does not ship', async () => {
    window.localStorage.setItem('lng', 'kl')
    const { i18n, t } = await loadI18n()
    expect(i18n.resolvedLanguage).toBe('en')
    expect(t('jobs.latest_tab')).toBe('LATEST RUN')
  })

  it('changeLanguage switches translations and persists the choice', async () => {
    const { t, i18n } = await loadI18n()
    i18n.changeLanguage('es')
    expect(i18n.resolvedLanguage).toBe('es')
    expect(t('jobs.latest_tab')).toBe('ÚLTIMA EJECUCIÓN')
    expect(window.localStorage.getItem('lng')).toBe('es')
  })

  it('ignores an unsupported language', async () => {
    const { i18n } = await loadI18n()
    i18n.changeLanguage('kl')
    expect(i18n.resolvedLanguage).toBe('en')
    expect(window.localStorage.getItem('lng')).toBeNull()
  })

  it('offers every locale in resources', async () => {
    const { languages } = await loadI18n()
    expect(languages).toEqual(expect.arrayContaining(['en', 'es', 'fr', 'pl', 'zh']))
  })
})
