// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AppBar, Chip, Toolbar } from '@mui/material'
import { DRAWER_WIDTH } from '@/shared/theme/theme'
import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import MigrationSetIndicator from '@/features/lineage/components/MigrationSetIndicator'
import OmniSearch from '@/features/search/components/omni-search/OmniSearch'
import React, { ReactElement } from 'react'
import Search from '@/features/search/SearchPage'

const Header = (): ReactElement => {
  const theme = useTheme()

  return (
    <AppBar
      position='fixed'
      elevation={0}
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        backgroundColor: theme.palette.background.default,
        borderBottom: `2px dashed ${theme.palette.secondary.main}`,
        left: `${DRAWER_WIDTH + 1}px`,
      }}
    >
      <Toolbar disableGutters>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'calc(100% - 97px)',
          }}
        >
          {/* minWidth 0 lets the search shrink; without it its content sets a
              floor that pushes whatever follows off the right of the screen. */}
          <Box display={'flex'} alignItems={'center'} sx={{ minWidth: 0, overflow: 'hidden' }}>
            <Search />
            <Chip
              size={'small'}
              variant={'outlined'}
              label={'⌘K'}
              sx={{ ml: 2, cursor: 'default' }}
            />
            <OmniSearch />
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            <MigrationSetIndicator />
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Header
