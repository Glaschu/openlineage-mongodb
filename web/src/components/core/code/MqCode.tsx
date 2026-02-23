// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { THEME_EXTRA } from '../../../helpers/theme'
import { solarizedDark } from 'react-syntax-highlighter/dist/cjs/styles/hljs'
import Box from '@mui/material/Box'
import MqText from '../text/MqText'
import SyntaxHighlighter from 'react-syntax-highlighter'

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
        language={language}
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
