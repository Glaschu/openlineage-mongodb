import {
  Chip,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { HEADER_HEIGHT, theme } from '@/shared/theme/theme'
import ArrowBackIosRounded from '@mui/icons-material/ArrowBackIosRounded'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import LinkOutlined from '@mui/icons-material/LinkOutlined'
import Refresh from '@mui/icons-material/Refresh'

import { LineageDirection, isLineageDirection } from './columnLineageUtils'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import MQTooltip from '@/shared/components/MqTooltip/MQTooltip'
import MqText from '@/shared/components/MqText/MqText'
import React from 'react'

interface ActionBarProps {
  refresh: () => void
  depth: number
  setDepth: (depth: number) => void
  onExportCsv?: () => void
}

export const ActionBar = ({ refresh, depth, setDepth, onExportCsv }: ActionBarProps) => {
  const { namespace, name } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedColumn = searchParams.get('columnName')
  const directionParam = searchParams.get('direction')
  const direction: LineageDirection = isLineageDirection(directionParam) ? directionParam : 'both'
  const isolate = searchParams.get('isolate') === 'true'

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams)
    mutate(params)
    setSearchParams(params)
  }

  const clearColumnSelection = () =>
    updateParams((params) => {
      params.delete('column')
      params.delete('columnName')
      params.delete('isolate')
    })

  return (
    <Box
      sx={{
        borderBottomWidth: 2,
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderStyle: 'dashed',
      }}
      display={'flex'}
      height={HEADER_HEIGHT - 1}
      justifyContent={'space-between'}
      alignItems={'center'}
      px={2}
      borderColor={theme.palette.secondary.main}
    >
      <Box display={'flex'} alignItems={'center'}>
        <MQTooltip title={'Back to datasets'}>
          <IconButton size={'small'} sx={{ mr: 2 }} onClick={() => navigate('/datasets')}>
            <ArrowBackIosRounded fontSize={'small'} />
          </IconButton>
        </MQTooltip>
        <Box>
          <MqText subdued>Mode</MqText>
          <MqText font={'mono'}>Column Level</MqText>
        </Box>
        <Divider orientation='vertical' flexItem sx={{ mx: 2 }} />
        <Box>
          <MqText subdued>Namespace</MqText>
          <MqText font={'mono'}>{namespace || 'Unknown namespace name'}</MqText>
        </Box>
        <Divider orientation='vertical' flexItem sx={{ mx: 2 }} />
        <Box>
          <MqText subdued>Name</MqText>
          <MqText font={'mono'}>{name || 'Unknown dataset name'}</MqText>
        </Box>
        {selectedColumn && (
          <>
            <Divider orientation='vertical' flexItem sx={{ mx: 2 }} />
            <Box>
              <MqText subdued>Column</MqText>
              <Chip
                size={'small'}
                color={'primary'}
                variant={'outlined'}
                label={selectedColumn}
                onDelete={clearColumnSelection}
              />
            </Box>
          </>
        )}
      </Box>
      <Box display={'flex'} alignItems={'center'}>
        <MQTooltip
          title={
            selectedColumn
              ? 'Trace direction relative to the selected column'
              : 'Select a column to trace its lineage'
          }
        >
          <ToggleButtonGroup
            size={'small'}
            exclusive
            disabled={!selectedColumn}
            value={direction}
            sx={{ mr: 2 }}
            onChange={(_event, value) => {
              if (isLineageDirection(value)) {
                updateParams((params) => params.set('direction', value))
              }
            }}
          >
            <ToggleButton value={'upstream'}>Upstream</ToggleButton>
            <ToggleButton value={'both'}>Both</ToggleButton>
            <ToggleButton value={'downstream'}>Downstream</ToggleButton>
          </ToggleButtonGroup>
        </MQTooltip>
        <MQTooltip title={'Hide columns not connected to the selected column'}>
          <FormControlLabel
            sx={{ mr: 2 }}
            control={
              <Switch
                size={'small'}
                disabled={!selectedColumn}
                checked={isolate}
                onChange={(event) =>
                  updateParams((params) => params.set('isolate', String(event.target.checked)))
                }
              />
            }
            label={<MqText subdued>Isolate</MqText>}
          />
        </MQTooltip>
        <MQTooltip title={'Export visible lineage as CSV (edge list with transformations)'}>
          <span>
            <IconButton
              size={'small'}
              color={'primary'}
              sx={{ mr: 1 }}
              disabled={!onExportCsv}
              onClick={() => onExportCsv?.()}
            >
              <FileDownloadOutlined fontSize={'small'} />
            </IconButton>
          </span>
        </MQTooltip>
        <MQTooltip title={'Copy a shareable link to this exact view'}>
          <IconButton
            size={'small'}
            color={'primary'}
            sx={{ mr: 2 }}
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
          >
            <LinkOutlined fontSize={'small'} />
          </IconButton>
        </MQTooltip>
        <MQTooltip title={'Refresh'}>
          <IconButton
            sx={{ mr: 2 }}
            color={'primary'}
            size={'small'}
            onClick={() => {
              if (namespace && name) {
                refresh()
              }
            }}
          >
            <Refresh fontSize={'small'} />
          </IconButton>
        </MQTooltip>
        <TextField
          id='column-level-depth'
          type='number'
          inputProps={{ min: 0 }}
          label='Depth'
          variant='outlined'
          size='small'
          sx={{ width: '80px' }}
          value={depth}
          onChange={(e) => {
            setDepth(isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value))
            searchParams.set('depth', e.target.value)
            setSearchParams(searchParams)
          }}
        />
      </Box>
    </Box>
  )
}
