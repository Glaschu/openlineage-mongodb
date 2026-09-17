// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import {
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import React, { useMemo, useState } from 'react'

import { ImpactRow } from './impact'
import { RunState } from '@/shared/types/api'
import { UNCLAIMED_OWNER, isUnclaimed } from '@/features/namespaces/owners'
import { encodeNode, runStateColor } from '@/shared/utils/nodes'
import { formatUpdatedAt } from '@/shared/utils'
import MqEmpty from '@/shared/components/MqEmpty/MqEmpty'
import MqStatus from '@/shared/components/MqStatus/MqStatus'
import MqText from '@/shared/components/MqText/MqText'

type SortKey =
  | 'direction'
  | 'type'
  | 'namespace'
  | 'owner'
  | 'name'
  | 'hops'
  | 'state'
  | 'updatedAt'

interface Column {
  key: SortKey
  label: string
  numeric?: boolean
}

const COLUMNS: Column[] = [
  { key: 'direction', label: 'Direction' },
  { key: 'type', label: 'Type' },
  { key: 'namespace', label: 'Namespace' },
  { key: 'owner', label: 'Owner' },
  { key: 'name', label: 'Name' },
  { key: 'hops', label: 'Hops', numeric: true },
  { key: 'state', label: 'Latest run' },
  { key: 'updatedAt', label: 'Updated' },
]

interface ExtraColumn {
  label: string
  render: (row: ImpactRow) => React.ReactNode
}

interface Props {
  rows: ImpactRow[]
  /** Text the caller has already applied is not re-applied here. */
  filter: string
  onFilterChange: (filter: string) => void
  /** Export controls appear only when the caller can handle them. */
  onExport?: () => void
  onExportEvidence?: () => void
  title?: string
  /** An extra leading column, for callers with something more to say per row. */
  extraColumn?: ExtraColumn
}

export const matchesFilter = (row: ImpactRow, filter: string) => {
  const needle = filter.trim().toLowerCase()
  if (!needle) return true

  return [row.namespace, row.owner ?? '', row.name, row.type, row.direction, row.state].some(
    (value) => value.toLowerCase().includes(needle)
  )
}

export const sortRows = (rows: ImpactRow[], key: SortKey, ascending: boolean) => {
  const direction = ascending ? 1 : -1

  return [...rows].sort((a, b) => {
    if (key === 'hops') return (a.hops - b.hops) * direction
    return String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * direction
  })
}

/**
 * The impact list: every node reachable from the focused one, flat and
 * sortable.
 *
 * A graph answers "how does this connect"; a migration or change ticket needs
 * "what else is affected, and how far away is it", which is a list once the
 * answer runs past a few dozen rows.
 */
export const ImpactTable = ({
  rows,
  filter,
  onFilterChange,
  onExport,
  onExportEvidence,
  title = 'Impact',
  extraColumn,
}: Props) => {
  const theme = useTheme()
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('hops')
  const [ascending, setAscending] = useState(true)

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) => matchesFilter(row, filter))
    return sortRows(filtered, sortKey, ascending)
  }, [rows, filter, sortKey, ascending])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAscending((current) => !current)
    else {
      setSortKey(key)
      setAscending(true)
    }
  }

  const upstreamCount = rows.filter((row) => row.direction === 'upstream').length
  const downstreamCount = rows.length - upstreamCount

  return (
    <Box px={2} py={2} height={'100%'} overflow={'auto'}>
      <Box display={'flex'} alignItems={'center'} gap={2} mb={2}>
        <MqText heading>{title}</MqText>
        <Chip size={'small'} variant={'outlined'} label={`${upstreamCount} upstream`} />
        <Chip size={'small'} variant={'outlined'} label={`${downstreamCount} downstream`} />
        <TextField
          size={'small'}
          label={'Filter'}
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          sx={{ width: 260, ml: 'auto' }}
        />
        {onExport && (
          <Button
            size={'small'}
            variant={'outlined'}
            startIcon={<FileDownloadOutlined fontSize={'small'} />}
            disabled={rows.length === 0}
            onClick={() => onExport()}
          >
            Export CSV
          </Button>
        )}
        {onExportEvidence && (
          <Button
            size={'small'}
            variant={'outlined'}
            startIcon={<DescriptionOutlined fontSize={'small'} />}
            onClick={() => onExportEvidence()}
          >
            Evidence pack
          </Button>
        )}
      </Box>

      {visibleRows.length === 0 ? (
        <MqEmpty title={'Nothing to show'}>
          <MqText subdued>
            {rows.length
              ? 'No impacted objects match this filter.'
              : 'Nothing upstream or downstream of this node in the loaded graph. Increase depth to trace further.'}
          </MqText>
        </MqEmpty>
      ) : (
        <Table size={'small'} aria-label={'Impacted objects'}>
          <TableHead>
            <TableRow>
              {extraColumn && (
                <TableCell>
                  <MqText subdued>{extraColumn.label}</MqText>
                </TableCell>
              )}
              {COLUMNS.map((column) => (
                <TableCell key={column.key} align={column.numeric ? 'right' : 'left'}>
                  <TableSortLabel
                    active={sortKey === column.key}
                    direction={sortKey === column.key && !ascending ? 'desc' : 'asc'}
                    onClick={() => toggleSort(column.key)}
                  >
                    <MqText subdued>{column.label}</MqText>
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow
                key={`${row.direction}:${row.id}`}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() =>
                  navigate(
                    `/lineage/${encodeNode(
                      row.type === 'JOB' ? 'JOB' : 'DATASET',
                      row.namespace,
                      row.name
                    )}`
                  )
                }
              >
                {extraColumn && <TableCell>{extraColumn.render(row)}</TableCell>}
                <TableCell>
                  <MqText
                    color={
                      row.direction === 'upstream'
                        ? theme.palette.primary.main
                        : theme.palette.info.main
                    }
                  >
                    {row.direction}
                  </MqText>
                </TableCell>
                <TableCell>
                  <MqText font={'mono'}>{row.type}</MqText>
                </TableCell>
                <TableCell>
                  <MqText font={'mono'}>{row.namespace}</MqText>
                </TableCell>
                <TableCell>
                  {isUnclaimed(row.owner ?? '') ? (
                    <MqText subdued>{UNCLAIMED_OWNER}</MqText>
                  ) : (
                    <MqText font={'mono'}>{row.owner}</MqText>
                  )}
                </TableCell>
                <TableCell>
                  <MqText font={'mono'}>{row.name}</MqText>
                </TableCell>
                <TableCell align={'right'}>
                  <MqText>{row.hops}</MqText>
                </TableCell>
                <TableCell>
                  {row.state ? (
                    <MqStatus label={row.state} color={runStateColor(row.state as RunState)} />
                  ) : (
                    <MqText subdued>—</MqText>
                  )}
                </TableCell>
                <TableCell>
                  <MqText subdued>{row.updatedAt ? formatUpdatedAt(row.updatedAt) : '—'}</MqText>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}

export default ImpactTable
