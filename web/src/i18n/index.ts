// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import i18next from 'i18next'

import { defaultNS, resources } from './resources'

const DETECTION_OPTIONS = {
  order: ['localStorage'],
  lookupLocalStorage: 'lng',
  caches: ['localStorage'],
}

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: false,
    fallbackLng: 'en',
    resources,
    defaultNS,
    detection: DETECTION_OPTIONS,
  })

export { defaultNS, resources }
export default i18next
