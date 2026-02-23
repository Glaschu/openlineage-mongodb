// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Box } from '@mui/material'
import { theme } from '../../helpers/theme'
import { useTranslation } from 'react-i18next'
import MqText from '../core/text/MqText'
import Typewriter from './Typewriter'

const SearchPlaceholder = () => {
  const { t } = useTranslation()
  return (
    <Box
      sx={{
        zIndex: theme.zIndex.appBar + 3,
        position: 'absolute',
        left: 40,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      <Box display={'inline'}>
        <MqText
          disabled
          inline
          font={'mono'}
          aria-label={t('search.search_aria')}
          aria-required='true'
        >
          Search your
        </MqText>
        <MqText bold inline>
          {' '}
          <Typewriter
            words={['Jobs and Datasets…', 'SQL queries…', 'Dataset columns…', 'Source code…']}
            repeatCount={3}
          />
        </MqText>
      </Box>
    </Box>
  )
}

export default SearchPlaceholder
