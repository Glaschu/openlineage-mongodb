// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Box, Chip } from '@mui/material'
import { DRAWER_WIDTH, HEADER_HEIGHT, theme } from '../../helpers/theme'
import { RootState } from '../../store/store'
import { MqInputBase } from '../core/input-base/MqInputBase'
import { REACT_APP_ADVANCED_SEARCH } from '../../globals'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import Close from '@mui/icons-material/Close'
import SearchOutlined from '@mui/icons-material/SearchOutlined'

import BaseSearch from './base-search/BaseSearch'
import CircularProgress from '@mui/material/CircularProgress/CircularProgress'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import IconButton from '@mui/material/IconButton'
import OpenSearch from './open-search/OpenSearch'
import SearchPlaceholder from './SearchPlaceholder'

const useCmdKShortcut = (callback: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault() // Prevent the default browser action
        callback()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [callback])
}

const useEscapeShortcut = (callback: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault() // Prevent the default browser action
        callback()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [callback])
}

const Search = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(true)

  const inputRef = useRef<HTMLInputElement>(null)

  // focus on cmd + k
  useCmdKShortcut(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  })

  useEffect(() => {
    if (search === '') setOpen(false)
  }, [search])

  useEscapeShortcut(() => {
    setOpen(false)
  })

  const location = useLocation()
  useEffect(() => {
    // close search on a route change
    setOpen(false)
    setSearch('')
  }, [location])

  return (
    <Box width={`calc(100vw - ${DRAWER_WIDTH}px)`} position={'relative'} id={'searchContainer'}>
      <Box
        sx={{
          zIndex: theme.zIndex.appBar + 3,
          position: 'absolute',
          left: theme.spacing(4),
          display: 'flex',
          alignItems: 'center',
          height: '100%',
        }}
      ></Box>
      {search.length === 0 && <SearchPlaceholder />}
      {search.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            zIndex: theme.zIndex.appBar + 3,
            right: theme.spacing(12),
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            cursor: 'pointer',
          }}
        ></Box>
      )}
      <ClickAwayListener
        mouseEvent='onMouseDown'
        touchEvent='onTouchStart'
        onClickAway={() => {
          setOpen(false)
          setSearch('')
        }}
      >
        <Box>
          <MqInputBase
            spellCheck={false}
            sx={{
              zIndex: theme.zIndex.appBar + 2,
              height: HEADER_HEIGHT - 1,
              paddingRight: theme.spacing(3),
            }}
            inputRef={inputRef}
            fullWidth={true}
            autoFocus
            startAdornment={<SearchOutlined />}
            endAdornment={
              <>
                {isLoading && <CircularProgress size={16} />}
                {open && (
                  <IconButton
                    color={'secondary'}
                    sx={{ mr: 1 }}
                    size={'small'}
                    onClick={() => {
                      setSearch('')
                      setOpen(false)
                    }}
                  >
                    <Close />
                  </IconButton>
                )}
                <Chip
                  color={open ? 'primary' : 'default'}
                  size={'small'}
                  variant={'outlined'}
                  label={'⌘K'}
                />
              </>
            }
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setSearch(event.target.value)
              setOpen(true)
            }}
            value={search}
            autoComplete={'off'}
            id={'searchBar'}
          />
          <Box>
            {open && search.length > 0 && (
              <Box
                position={'absolute'}
                width={'100%'}
                sx={{
                  position: 'absolute',
                  width: '100%',
                  top: 0,
                  right: 0,
                  left: '-3px',
                  zIndex: theme.zIndex.appBar + 1,
                  border: `2px dashed ${theme.palette.secondary.main}`,
                  borderRadius: theme.spacing(1),
                  backgroundColor: theme.palette.background.default,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                }}
              >
                <Box
                  mt={`${HEADER_HEIGHT - 1}px`}
                  borderTop={1}
                  borderColor={'divider'}
                  overflow={'auto'}
                  maxHeight={`calc(100vh - ${HEADER_HEIGHT}px - 24px)`}
                >
                  {REACT_APP_ADVANCED_SEARCH ? (
                    <OpenSearch search={search} onIsLoading={setIsLoading} />
                  ) : (
                    <BaseSearch search={search} onIsLoading={setIsLoading} />
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </ClickAwayListener>
    </Box>
  )
}

export default Search
