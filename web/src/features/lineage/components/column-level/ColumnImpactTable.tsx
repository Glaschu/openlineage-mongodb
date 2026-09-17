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
import { useSearchParams } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import React, { useMemo, useState } from 'react'

import { ColumnImpactRow } from './columnImpact'
import { UNCLAIMED_OWNER, isUnclaimed } from '@/features/namespaces/owners'
import MqEmpty from '@/shared/components/MqEmpty/MqEmpty'
import MqText from '@/shared/components/MqText/MqText'

type SortKey =
  | 'direction'
  | 'namespace'
  | 'owner'
  | 'dataset'
  | 'column'
  | 'hops'
  | 'transformation'

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'direction', label: 'Direction' },
  { key: 'namespace', label: 'Namespace' },
  { key: 'owner', label: 'Owner' },
  { key: 'dataset', label: 'Dataset' },
  { key: 'column', label: 'Column' },
  { key: 'hops', label: 'Hops', numeric: true },
  { key: 'transformation', label: 'Transformation' },
]

export const matchesColumnFilter = (row: ColumnImpactRow, filter: string) => {
  const needle = filter.trim().toLowerCase()
  if (!needle) return true

  return [row.namespace, row.dataset, row.column, row.direction, row.transformation].some((value) =>
    value.toLowerCase().includes(needle)
  )
}

export const sortColumnRows = (rows: ColumnImpactRow[], key: SortKey, ascending: boolean) => {
  const direction = ascending ? 1 : -1

  return [...rows].sort((a, b) => {
    if (key === 'hops') return (a.hops - b.hops) * direction
    return String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * direction
  })
}

interface Props {
  rows: ColumnImpactRow[]
  /** The column the list is computed from; absent means nothing is selected. */
  selectedColumn?: string | null
  filter: string
  onFilterChange: (filter: string) => void
  onExport?: () => void
  onExportEvidence?: () => void
}

/**
 * The flat answer to "what consumes this field" — the question a graph cannot
 * answer once the reply runs to hundreds of rows, and the one an auditor
 * tracing a regulated field asks first.
 */
export const ColumnImpactTable = ({
  rows,
  selectedColumn,
  filter,
  onFilterChange,
  onExport,
  onExportEvidence,
}: Props) => {
  const theme = useTheme()
  const [, setSearchParams] = useSearchParams()
  const [sortKey, setSortKey] = useState<SortKey>('hops')
  const [ascending, setAscending] = useState(true)

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) => matchesColumnFilter(row, filter))
    return sortColumnRows(filtered, sortKey, ascending)
  }, [rows, filter, sortKey, ascending])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAscending((current) => !current)
    else {
      setSortKey(key)
      setAscending(true)
    }
  }

  const upstreamCount = rows.filter((row) => row.direction === 'upstream').length

  if (!selectedColumn) {
    return (
      <Box px={2} py={4}>
        <MqEmpty title={'No column selected'}>
          <MqText subdued>
            Pick a column — in the graph or the Find column box — to list everything it feeds and
            everything it is derived from.
          </MqText>
        </MqEmpty>
      </Box>
    )
  }

  return (
    <Box px={2} py={2} height={'100%'} overflow={'auto'}>
      <Box display={'flex'} alignItems={'center'} gap={2} mb={2}>
        <MqText heading>Impact</MqText>
        <Chip size={'small'} variant={'outlined'} label={`${upstreamCount} upstream`} />
        <Chip
          size={'small'}
          variant={'outlined'}
          label={`${rows.length - upstreamCount} downstream`}
        />
        <TextField
          size={'small'}
          label={'Filter'}
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          sx={{ width: 240, ml: 'auto' }}
        />
        <Button
          size={'small'}
          variant={'outlined'}
          startIcon={<FileDownloadOutlined fontSize={'small'} />}
          disabled={!onExport || rows.length === 0}
          onClick={() => onExport?.()}
        >
          Export CSV
        </Button>
        <Button
          size={'small'}
          variant={'outlined'}
          startIcon={<DescriptionOutlined fontSize={'small'} />}
          disabled={!onExportEvidence}
          onClick={() => onExportEvidence?.()}
        >
          Evidence pack
        </Button>
      </Box>

      {visibleRows.length === 0 ? (
        <MqEmpty title={'Nothing to show'}>
          <MqText subdued>
            {rows.length
              ? 'No impacted columns match this filter.'
              : 'This column has no lineage in the loaded graph. Increase depth to trace further.'}
          </MqText>
        </MqEmpty>
      ) : (
        <Table size={'small'} aria-label={'Impacted columns'}>
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
                  setSearchParams((previous) => {
                    const next = new URLSearchParams(previous)
                    next.set('column', row.id)
                    next.set('columnName', row.column)
                    next.set('dataset', row.dataset)
                    next.set('namespace', row.namespace)
                    return next
                  })
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
                  <MqText font={'mono'}>{row.dataset}</MqText>
                </TableCell>
                <TableCell>
                  <MqText font={'mono'}>{row.column}</MqText>
                </TableCell>
                <TableCell align={'right'}>
                  <MqText>{row.hops}</MqText>
                </TableCell>
                <TableCell>
                  {row.transformation ? (
                    <Chip size={'small'} variant={'outlined'} label={row.transformation} />
                  ) : (
                    <MqText subdued>—</MqText>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}

export default ColumnImpactTable
