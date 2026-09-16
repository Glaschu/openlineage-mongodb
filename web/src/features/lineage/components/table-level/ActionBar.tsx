import {
  Autocomplete,
  Chip,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { FEATURE_FLAGS } from '@/shared/config/featureFlags'
import { HEADER_HEIGHT, theme } from '@/shared/theme/theme'
import ArrowBackIosRounded from '@mui/icons-material/ArrowBackIosRounded'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import Refresh from '@mui/icons-material/Refresh'

import { truncateText } from '@/shared/utils/text'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import MQTooltip from '@/shared/components/MqTooltip/MQTooltip'
import MqText from '@/shared/components/MqText/MqText'
import React from 'react'

export interface GraphSearchOption {
  id: string
  name: string
  namespace: string
  kind: string
}

interface ActionBarProps {
  nodeType: 'DATASET' | 'JOB'
  refresh: () => void
  depth: number
  setDepth: (depth: number) => void
  isCompact: boolean
  setIsCompact: (isCompact: boolean) => void
  /** True when compact mode was turned on for us because the graph is large. */
  isCompactAutomatic?: boolean
  isFull: boolean
  setIsFull: (isFull: boolean) => void
  aggregateByParent: boolean
  setAggregateByParent: (aggregateByParent: boolean) => void
  groupByNamespace: boolean
  setGroupByNamespace: (groupByNamespace: boolean) => void
  /** Every node currently laid out, for the find-a-node box. */
  searchOptions?: GraphSearchOption[]
  onSelectNode?: (nodeId: string | null) => void
  view: 'graph' | 'impact'
  setView: (view: 'graph' | 'impact') => void
  /** Writes the impact list to a CSV; absent while there is nothing to export. */
  onExportImpact?: () => void
}

export const ActionBar = ({
  nodeType,
  refresh,
  depth,
  setDepth,
  isCompact,
  setIsCompact,
  isCompactAutomatic = false,
  isFull,
  setIsFull,
  aggregateByParent,
  setAggregateByParent,
  groupByNamespace,
  setGroupByNamespace,
  searchOptions = [],
  onSelectNode,
  view,
  setView,
  onExportImpact,
}: ActionBarProps) => {
  const { namespace, name } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const expandedNamespaces = (searchParams.get('expandedNamespaces') ?? '')
    .split(',')
    .filter(Boolean)

  // Expanding happens by clicking a namespace node; once expanded that node is
  // gone, so collapsing back needs a handle of its own.
  const collapseNamespace = (target: string) => {
    const params = new URLSearchParams(searchParams)
    const remaining = expandedNamespaces.filter((entry) => entry !== target)
    if (remaining.length) params.set('expandedNamespaces', remaining.join(','))
    else params.delete('expandedNamespaces')
    setSearchParams(params)
  }
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
        <MQTooltip title={`Back to ${nodeType === 'JOB' ? 'jobs' : 'datasets'}`}>
          <IconButton
            size={'small'}
            sx={{ mr: 2 }}
            onClick={() => navigate(nodeType === 'JOB' ? '/' : '/datasets')}
          >
            <ArrowBackIosRounded fontSize={'small'} />
          </IconButton>
        </MQTooltip>
        <MqText heading>{nodeType === 'JOB' ? 'Jobs' : 'Datasets'}</MqText>
        <Divider orientation='vertical' flexItem sx={{ mx: 2 }} />
        <Box>
          <MqText subdued>Mode</MqText>
          <MqText font={'mono'}>Table Level</MqText>
        </Box>
        <Divider orientation='vertical' flexItem sx={{ mx: 2 }} />
        <Box>
          <MqText subdued>Namespace</MqText>
          <MqText font={'mono'}>
            {namespace ? truncateText(namespace, 40) : 'Unknown namespace name'}
          </MqText>
        </Box>
        <Divider orientation='vertical' flexItem sx={{ mx: 2 }} />
        <Box>
          <MqText subdued>Name</MqText>
          <MqText font={'mono'}>{name ? truncateText(name, 40) : 'Unknown dataset name'}</MqText>
        </Box>
      </Box>
      <Box display={'flex'} alignItems={'center'}>
        {expandedNamespaces.length > 0 && (
          <Box display={'flex'} alignItems={'center'} gap={1} mr={2}>
            <MqText subdued>Expanded</MqText>
            {expandedNamespaces.map((expanded) => (
              <Chip
                key={expanded}
                size={'small'}
                color={'primary'}
                variant={'outlined'}
                label={expanded}
                onDelete={() => collapseNamespace(expanded)}
              />
            ))}
          </Box>
        )}
        <Autocomplete
          id='lineage-node-search'
          size='small'
          sx={{ width: 260, mr: 2 }}
          options={searchOptions}
          getOptionLabel={(option) => option.name}
          groupBy={(option) => option.kind}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_event, option) => onSelectNode?.(option ? option.id : null)}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Box>
                <MqText font={'mono'}>{option.name}</MqText>
                <MqText subdued font={'mono'}>
                  {option.namespace}
                </MqText>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} label='Find node' variant='outlined' size='small' />
          )}
        />
        <ToggleButtonGroup
          size={'small'}
          exclusive
          value={view}
          sx={{ mr: 2 }}
          onChange={(_event, value) => {
            if (value !== 'graph' && value !== 'impact') return
            setView(value)
            searchParams.set('view', value)
            setSearchParams(searchParams)
          }}
        >
          <ToggleButton value={'graph'}>Graph</ToggleButton>
          <ToggleButton value={'impact'}>Impact</ToggleButton>
        </ToggleButtonGroup>
        <MQTooltip title={'Export the impact list as CSV for a change ticket or evidence pack'}>
          <span>
            <IconButton
              size={'small'}
              color={'primary'}
              sx={{ mr: 1 }}
              disabled={!onExportImpact}
              onClick={() => onExportImpact?.()}
            >
              <FileDownloadOutlined fontSize={'small'} />
            </IconButton>
          </span>
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
          sx={{ width: '80px', mr: 2 }}
          value={depth}
          onChange={(e) => {
            setDepth(isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value))
            searchParams.set('depth', e.target.value)
            setSearchParams(searchParams)
          }}
        />
        <Box display={'flex'} flexDirection={'column'}>
          <FormControlLabel
            control={
              <Switch
                size={'small'}
                checked={isFull}
                onChange={(_, checked) => {
                  setIsFull(checked)
                  searchParams.set('isFull', checked.toString())
                  setSearchParams(searchParams)
                }}
              />
            }
            label={<MqText font={'mono'}>Full Graph</MqText>}
          />
          <FormControlLabel
            control={
              <Switch
                size={'small'}
                checked={isCompact}
                onChange={(_, checked) => {
                  setIsCompact(checked)
                  searchParams.set('isCompact', checked.toString())
                  setSearchParams(searchParams)
                }}
              />
            }
            label={
              <MqText font={'mono'}>
                {isCompactAutomatic ? 'Compact Nodes (auto)' : 'Compact Nodes'}
              </MqText>
            }
            title={
              isCompactAutomatic
                ? 'Compacted automatically because this graph is large. Toggle to override.'
                : 'Collapse dataset nodes to a single row'
            }
          />
          <FormControlLabel
            control={
              <Switch
                size={'small'}
                checked={groupByNamespace}
                onChange={(_, checked) => {
                  setGroupByNamespace(checked)
                  searchParams.set('groupByNamespace', checked.toString())
                  setSearchParams(searchParams)
                }}
              />
            }
            label={<MqText font={'mono'}>Collapse to Namespaces</MqText>}
            title={'Show one node per namespace, with the connections between them counted'}
          />
          {FEATURE_FLAGS.showGroupByParentToggle && (
            <FormControlLabel
              control={
                <Switch
                  size={'small'}
                  checked={aggregateByParent}
                  onChange={(_, checked) => {
                    setAggregateByParent(checked)
                    searchParams.set('aggregateByParent', checked.toString())
                    setSearchParams(searchParams)
                  }}
                />
              }
              label={<MqText font={'mono'}>Group by Parent</MqText>}
            />
          )}
        </Box>
      </Box>
    </Box>
  )
}
