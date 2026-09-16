// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import {
  Box,
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
import React, { useMemo, useState } from 'react'

import { ImpactRow } from './impact'
import { RunState } from '@/shared/types/api'
import { encodeNode, runStateColor } from '@/shared/utils/nodes'
import { formatUpdatedAt } from '@/shared/utils'
import MqEmpty from '@/shared/components/MqEmpty/MqEmpty'
import MqStatus from '@/shared/components/MqStatus/MqStatus'
import MqText from '@/shared/components/MqText/MqText'

type SortKey = 'direction' | 'type' | 'namespace' | 'name' | 'hops' | 'state' | 'updatedAt'

interface Column {
  key: SortKey
  label: string
  numeric?: boolean
}

const COLUMNS: Column[] = [
  { key: 'direction', label: 'Direction' },
  { key: 'type', label: 'Type' },
  { key: 'namespace', label: 'Namespace' },
  { key: 'name', label: 'Name' },
  { key: 'hops', label: 'Hops', numeric: true },
  { key: 'state', label: 'Latest run' },
  { key: 'updatedAt', label: 'Updated' },
]

interface Props {
  rows: ImpactRow[]
  /** Text the caller has already applied is not re-applied here. */
  filter: string
  onFilterChange: (filter: string) => void
}

export const matchesFilter = (row: ImpactRow, filter: string) => {
  const needle = filter.trim().toLowerCase()
  if (!needle) return true

  return [row.namespace, row.name, row.type, row.direction, row.state].some((value) =>
    value.toLowerCase().includes(needle)
  )
}

export const sortRows = (rows: ImpactRow[], key: SortKey, ascending: boolean) => {
  const direction = ascending ? 1 : -1

  return [...rows].sort((a, b) => {
    if (key === 'hops') return (a.hops - b.hops) * direction
    return String(a[key]).localeCompare(String(b[key])) * direction
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
export const ImpactTable = ({ rows, filter, onFilterChange }: Props) => {
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
        <MqText heading>Impact</MqText>
        <Chip size={'small'} variant={'outlined'} label={`${upstreamCount} upstream`} />
        <Chip size={'small'} variant={'outlined'} label={`${downstreamCount} downstream`} />
        <TextField
          size={'small'}
          label={'Filter'}
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          sx={{ width: 260, ml: 'auto' }}
        />
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
