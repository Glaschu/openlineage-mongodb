// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Autocomplete, Box, FormControl, TextField } from '@mui/material'
import { Namespace } from '../../types/api'
import { RootState } from '../../store/store'
import { selectNamespace } from '../../store/slices/namespacesSlice'
import { theme } from '../../helpers/theme'
import { useDispatch, useSelector } from 'react-redux'
import { useNamespaces } from '../../queries/namespaces'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import MqText from '../core/text/MqText'

const NamespaceSelect = () => {
  // Redux hooks
  const { data: namespacesData } = useNamespaces()
  const namespaces: Namespace[] = namespacesData?.namespaces || []
  const selectedNamespace = useSelector((state: RootState) => state.namespaces.selectedNamespace)
  const dispatch = useDispatch()

  const { t } = useTranslation()

  useEffect(() => {
    if (!selectedNamespace && namespaces.length > 0) {
      const defaultNs = namespaces.find((n) => n.name === 'default') || namespaces[0]
      dispatch(selectNamespace(defaultNs.name))
    }
  }, [selectedNamespace, namespaces, dispatch])

  if (selectedNamespace) {
    const selectedOption = namespaces.find((n) => n.name === selectedNamespace) || undefined

    return (
      <FormControl
        variant='outlined'
        sx={{
          minWidth: '220px',
          position: 'relative',
        }}
      >
        <Autocomplete
          id='namespace-select'
          options={namespaces}
          getOptionLabel={(option) => option.name}
          value={selectedOption}
          disableClearable
          onChange={(_event, newValue) => {
            if (newValue) {
              dispatch(selectNamespace(newValue.name))
            }
          }}
          groupBy={(option) => {
            if (option.name.includes('://')) {
              return option.name.split('://')[0].toUpperCase()
            } else if (option.name.includes(':')) {
              return option.name.split(':')[0].toUpperCase()
            }
            return 'GENERAL'
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              size='small'
              placeholder={t('namespace_select.prompt')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  paddingLeft: theme.spacing(1),
                },
              }}
            />
          )}
          renderGroup={(params) => (
            <li key={params.key}>
              <Box
                sx={{
                  backgroundColor: theme.palette.action.selected,
                  padding: '4px 16px',
                  position: 'sticky',
                  top: '-8px',
                  zIndex: 1,
                }}
              >
                <MqText bold subdued small font={'mono'}>
                  {params.group}
                </MqText>
              </Box>
              <ul style={{ padding: 0 }}>{params.children}</ul>
            </li>
          )}
        />
      </FormControl>
    )
  } else return null
}

export default NamespaceSelect
