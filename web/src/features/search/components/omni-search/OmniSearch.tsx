// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

// Cmd-K omnisearch: the search-first front door for a deployment with hundreds of
// namespaces. Datasets and jobs come from the /search endpoint; columns are matched
// client-side within the currently selected namespace (the base API has no column
// search) and deep-link straight into the column lineage view.

import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListSubheader,
  TextField,
} from '@mui/material'
import { Field, GroupedSearch } from '@/shared/types/api'
import { RootState } from '@/store/store'
import { encodeNode } from '@/shared/utils/nodes'
import { getDatasets } from '@/features/datasets/api/requests'
import { theme } from '@/shared/theme/theme'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@/features/search/api'
import { useSelector } from 'react-redux'
import MqText from '@/shared/components/MqText/MqText'
import React, { useEffect, useMemo, useState } from 'react'
import SearchIcon from '@mui/icons-material/Search'

const MAX_GROUP_RESULTS = 6

interface ColumnHit {
  namespace: string
  dataset: string
  field: Field
}

const useDebounced = (value: string, delayMs = 250) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export const OmniSearch = () => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query)
  const navigate = useNavigate()
  const selectedNamespace = useSelector((state: RootState) => state.namespaces.selectedNamespace)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((wasOpen) => !wasOpen)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const { data: searchData, isFetching } = useSearch(debouncedQuery, 'ALL', 'NAME', 20)

  // Columns are matched within the selected namespace's datasets, client-side.
  const { data: namespaceDatasets } = useQuery({
    queryKey: ['omnisearch-datasets', selectedNamespace],
    queryFn: () => getDatasets(selectedNamespace as string, 100, 0),
    enabled: open && !!selectedNamespace,
    staleTime: 1000 * 60 * 5,
  })

  const columnHits: ColumnHit[] = useMemo(() => {
    const text = debouncedQuery.trim().toLowerCase()
    if (!text || !namespaceDatasets) return []
    const hits: ColumnHit[] = []
    for (const dataset of namespaceDatasets.datasets) {
      for (const field of dataset.fields) {
        if (field.name.toLowerCase().includes(text)) {
          hits.push({ namespace: dataset.namespace, dataset: dataset.name, field })
          if (hits.length >= MAX_GROUP_RESULTS) return hits
        }
      }
    }
    return hits
  }, [debouncedQuery, namespaceDatasets])

  const datasets = (searchData?.rawResults ?? [])
    .filter((result) => result.type === 'DATASET')
    .slice(0, MAX_GROUP_RESULTS)
  const jobs = (searchData?.rawResults ?? [])
    .filter((result) => result.type === 'JOB')
    .slice(0, MAX_GROUP_RESULTS)

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  const openNode = (result: GroupedSearch) => {
    navigate(`/lineage/${encodeNode(result.type, result.namespace, result.name)}`)
    close()
  }

  const openColumn = (hit: ColumnHit) => {
    const params = new URLSearchParams({
      dataset: hit.dataset,
      namespace: hit.namespace,
      column: `datasetField:${hit.namespace}:${hit.dataset}:${hit.field.name}`,
      columnName: hit.field.name,
    })
    navigate(
      `/datasets/column-level/${encodeURIComponent(hit.namespace)}/${encodeURIComponent(
        hit.dataset
      )}?${params.toString()}`
    )
    close()
  }

  const hasResults = datasets.length > 0 || jobs.length > 0 || columnHits.length > 0

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth={'sm'}
      PaperProps={{ sx: { position: 'fixed', top: 80, m: 0 } }}
    >
      <Box p={2} pb={hasResults || debouncedQuery ? 0 : 2}>
        <TextField
          autoFocus
          fullWidth
          size={'small'}
          placeholder={'Search datasets, jobs, and columns…'}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position={'start'}>
                <SearchIcon fontSize={'small'} />
              </InputAdornment>
            ),
            endAdornment: isFetching ? (
              <InputAdornment position={'end'}>
                <CircularProgress size={16} />
              </InputAdornment>
            ) : undefined,
          }}
        />
        {!debouncedQuery && (
          <Box mt={1}>
            <MqText subdued small>
              {selectedNamespace
                ? `Columns are matched within ${selectedNamespace}. Esc to close.`
                : 'Select a namespace to enable column matching. Esc to close.'}
            </MqText>
          </Box>
        )}
      </Box>
      {debouncedQuery && (
        <List dense sx={{ maxHeight: 420, overflowY: 'auto', pt: 0 }}>
          {columnHits.length > 0 && (
            <>
              <ListSubheader sx={{ bgcolor: theme.palette.background.paper }}>
                COLUMNS
              </ListSubheader>
              {columnHits.map((hit) => (
                <ListItemButton
                  key={`${hit.namespace}:${hit.dataset}:${hit.field.name}`}
                  onClick={() => openColumn(hit)}
                >
                  <Box
                    display={'flex'}
                    width={'100%'}
                    justifyContent={'space-between'}
                    alignItems={'center'}
                  >
                    <MqText font={'mono'}>{`${hit.dataset}.${hit.field.name}`}</MqText>
                    <Box display={'flex'} gap={1} alignItems={'center'}>
                      {hit.field.type && (
                        <Chip size={'small'} variant={'outlined'} label={hit.field.type} />
                      )}
                      <MqText subdued small>
                        {hit.namespace}
                      </MqText>
                    </Box>
                  </Box>
                </ListItemButton>
              ))}
              <Divider />
            </>
          )}
          {datasets.length > 0 && (
            <>
              <ListSubheader sx={{ bgcolor: theme.palette.background.paper }}>
                DATASETS
              </ListSubheader>
              {datasets.map((result) => (
                <ListItemButton key={result.nodeId} onClick={() => openNode(result)}>
                  <Box
                    display={'flex'}
                    width={'100%'}
                    justifyContent={'space-between'}
                    alignItems={'center'}
                  >
                    <MqText font={'mono'}>{result.name}</MqText>
                    <MqText subdued small>
                      {result.namespace}
                    </MqText>
                  </Box>
                </ListItemButton>
              ))}
              <Divider />
            </>
          )}
          {jobs.length > 0 && (
            <>
              <ListSubheader sx={{ bgcolor: theme.palette.background.paper }}>JOBS</ListSubheader>
              {jobs.map((result) => (
                <ListItemButton key={result.nodeId} onClick={() => openNode(result)}>
                  <Box
                    display={'flex'}
                    width={'100%'}
                    justifyContent={'space-between'}
                    alignItems={'center'}
                  >
                    <MqText font={'mono'}>{result.name}</MqText>
                    <MqText subdued small>
                      {result.namespace}
                    </MqText>
                  </Box>
                </ListItemButton>
              ))}
            </>
          )}
          {!hasResults && !isFetching && (
            <Box p={2}>
              <MqText subdued>No matches for “{debouncedQuery}”.</MqText>
            </Box>
          )}
        </List>
      )}
    </Dialog>
  )
}

export default OmniSearch
