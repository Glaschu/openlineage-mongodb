// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { createRoot } from 'react-dom/client'

import App from '@/app/App'
import '@/styles/index.css'
import '@/i18n'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<App />)
}
