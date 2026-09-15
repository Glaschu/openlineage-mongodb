// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import { THEME_EXTRA } from '@/shared/theme/theme'
import { solarizedDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import Box from '@mui/material/Box'
import MqText from '../MqText/MqText'

import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash'
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go'
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java'
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript'
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json'
import plaintext from 'react-syntax-highlighter/dist/esm/languages/hljs/plaintext'
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python'
import r from 'react-syntax-highlighter/dist/esm/languages/hljs/r'
import ruby from 'react-syntax-highlighter/dist/esm/languages/hljs/ruby'
import scala from 'react-syntax-highlighter/dist/esm/languages/hljs/scala'
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql'
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript'
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml'
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml'

// The default react-syntax-highlighter entry bundles highlight.js with every
// language it supports (~1 MB). We register only the languages that turn up in
// OpenLineage sql/sourceCode facets; anything else still renders, unhighlighted.
const LANGUAGES: Record<string, any> = {
  bash,
  go,
  java,
  javascript,
  json,
  plaintext,
  python,
  r,
  ruby,
  scala,
  sql,
  typescript,
  xml,
  yaml,
}

Object.entries(LANGUAGES).forEach(([name, definition]) => {
  SyntaxHighlighter.registerLanguage(name, definition)
})

// Aliases seen in sourceCode facets.
const ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  html: 'xml',
  text: 'plaintext',
}

const resolveLanguage = (language?: string) => {
  if (!language) return undefined
  const normalized = language.toLowerCase()
  return ALIASES[normalized] ?? normalized
}

interface MqCodeProps {
  code?: string
  language?: string
  description?: string
}

const MqCode = ({ code, description, language }: MqCodeProps) => {
  if (!code) {
    return null
  }
  return (
    <Box>
      {description && (
        <Box mb={2}>
          <MqText bold font={'mono'} subdued>
            {description}
          </MqText>
        </Box>
      )}
      <SyntaxHighlighter
        language={resolveLanguage(language)}
        style={solarizedDark}
        customStyle={{
          backgroundColor: '#191f26',
          borderLeft: `2px dashed ${THEME_EXTRA.typography.subdued}`,
          fontSize: '13px',
          padding: '0 4px',
        }}
      >
        {code ? code : 'No code available'}
      </SyntaxHighlighter>
    </Box>
  )
}

export default MqCode
