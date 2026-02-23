// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { GroupedSearch } from '../../../types/api'
import { faCog, faDatabase, faSort } from '@fortawesome/free-solid-svg-icons'
import { parseSearchGroup } from '../../../helpers/nodes'
import { setSelectedNode } from '../../../store/slices/lineageSlice'
import { theme } from '../../../helpers/theme'
import { useDispatch } from 'react-redux'
import { useSearch } from '../../../queries/search'
import { useTranslation } from 'react-i18next'
import Box from '@mui/system/Box'
import MqChipGroup from '../../core/chip/MqChipGroup'
import MqText from '../../core/text/MqText'
import React, { useEffect, useState } from 'react'
import SearchListItem from '../SearchListItem'

interface BaseSearchProps {
  search: string
  onIsLoading?: (isLoading: boolean) => void
}

const INITIAL_SEARCH_FILTER = [
  {
    text: 'All',
    value: 'All',
  },
  {
    icon: faCog,
    foregroundColor: theme.palette.common.white,
    backgroundColor: theme.palette.primary.main,
    text: 'JOBS',
    value: 'JOB',
  },
  {
    icon: faDatabase,
    foregroundColor: theme.palette.common.white,
    backgroundColor: theme.palette.info.main,
    text: 'DATASETS',
    value: 'DATASET',
  },
]

const INITIAL_SEARCH_SORT_FILTER = [
  {
    icon: faSort,
    value: 'Sort',
    foregroundColor: theme.palette.common.white,
    backgroundColor: 'transparent',
    selectable: false,
  },
  {
    text: 'Updated at',
    value: 'UPDATE_AT',
  },
  {
    text: 'Name',
    value: 'NAME',
  },
]

const BaseSearch = ({ search, onIsLoading }: BaseSearchProps) => {
  const dispatch = useDispatch()
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('UPDATE_AT')

  const {
    data,
    isLoading: isSearching,
    isSuccess,
  } = useSearch(search, filter.toUpperCase(), sort.toUpperCase())
  const searchResults = data?.results || new Map<string, GroupedSearch[]>()

  useEffect(() => {
    if (onIsLoading) {
      onIsLoading(isSearching)
    }
  }, [isSearching, onIsLoading])

  const { t } = useTranslation()

  const onSelectFilter = (label: string) => {
    setFilter(label)
  }

  const onSelectSortFilter = (label: string) => {
    setSort(label)
  }

  return (
    <>
      <Box
        sx={{
          padding: theme.spacing(2),
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <MqChipGroup
          chips={INITIAL_SEARCH_FILTER}
          onSelect={onSelectFilter}
          initialSelection={filter}
        />
        <MqChipGroup
          chips={INITIAL_SEARCH_SORT_FILTER}
          onSelect={onSelectSortFilter}
          initialSelection={sort}
        />
      </Box>
      <Box
        sx={{
          margin: 0,
          overflow: 'auto',
          maxHeight: `calc(100vh - ${theme.spacing(20)})`,
          paddingLeft: 0,
          borderBottomLeftRadius: theme.spacing(1),
          borderBottomRightRadius: theme.spacing(1),
        }}
      >
        {searchResults.size === 0 && (
          <Box m={2} display={'flex'} alignItems={'center'} justifyContent={'center'}>
            <MqText>{isSearching || !isSuccess ? t('search.status') : t('search.none')}</MqText>
          </Box>
        )}
        {[...searchResults].map((resultsWithGroups) => {
          return resultsWithGroups.map((result: string | GroupedSearch[]) => {
            if (typeof result === 'string') {
              // is group
              if (result.length > 0) {
                return (
                  <Box
                    sx={{
                      borderTop: `2px dashed ${theme.palette.secondary.main}`,
                      borderBottom: `2px dashed ${theme.palette.secondary.main}`,
                      padding: `${theme.spacing(0)} ${theme.spacing(3)} ${theme.spacing(
                        0.5
                      )} ${theme.spacing(1)}`,
                      backgroundColor: theme.palette.background.paper,
                    }}
                    key={result}
                    display={'flex'}
                    justifyContent={'space-between'}
                    alignItems={'center'}
                  >
                    <Box>
                      <MqText bold font={'mono'}>
                        {parseSearchGroup(result, 'group')}
                      </MqText>
                    </Box>
                    <Box>
                      <MqText bold font={'mono'} small>
                        {parseSearchGroup(result, 'namespace')}
                      </MqText>
                    </Box>
                  </Box>
                )
              } else return null
              // is a list of group members
            } else if (result.length) {
              return (
                <Box
                  key={(result[0] as GroupedSearch).group + (result[0] as GroupedSearch).namespace}
                >
                  {(result as GroupedSearch[]).map((listItem: GroupedSearch) => {
                    return (
                      <React.Fragment key={listItem.name}>
                        <SearchListItem
                          searchResult={listItem}
                          search={search}
                          onClick={() => {
                            dispatch(setSelectedNode(listItem.nodeId))
                          }}
                        />
                      </React.Fragment>
                    )
                  })}
                </Box>
              )
            } else {
              return null
            }
          })
        })}
      </Box>
    </>
  )
}

export default BaseSearch
