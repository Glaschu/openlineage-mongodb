// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { createRoot } from 'react-dom/client'

import '@/i18n'
import '@/styles/index.css'
import App from '@/app/App'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<App />)
}
