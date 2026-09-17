// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Alert, Box, Button, Chip, CircularProgress } from '@mui/material'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import React from 'react'

import { ColumnImpactTable } from './ColumnImpactTable'
import { ColumnMigrationRow, ColumnMigrationSummary, describeColumnMember } from './columnMigration'
import MqEmpty from '@/shared/components/MqEmpty/MqEmpty'
import MqText from '@/shared/components/MqText/MqText'

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`

interface Props {
  members: string[]
  rows: ColumnMigrationRow[]
  summary: ColumnMigrationSummary
  isLoading: boolean
  filter: string
  onFilterChange: (filter: string) => void
  onRemoveMember: (nodeId: string) => void
  onExportCsv?: () => void
  onExportEvidence?: () => void
}

/**
 * The plan view for a field-level change: which columns are changing, and what
 * reads them.
 */
export const ColumnMigrationPanel = ({
  members,
  rows,
  summary,
  isLoading,
  filter,
  onFilterChange,
  onRemoveMember,
  onExportCsv,
  onExportEvidence,
}: Props) => {
  if (!members.length) {
    return (
      <Box px={2} py={4}>
        <MqEmpty title={'No columns in this change'}>
          <MqText subdued>
            Select a column and use the add button in the action bar to include it. The plan shows
            every column that reads the ones you are changing, and who owns them.
          </MqText>
        </MqEmpty>
      </Box>
    )
  }

  return (
    <Box px={2} py={2} height={'100%'} overflow={'auto'}>
      <Box display={'flex'} alignItems={'center'} gap={2} mb={1} flexWrap={'wrap'}>
        <MqText heading>Column change</MqText>
        {members.map((member) => (
          <Chip
            key={member}
            size={'small'}
            color={'primary'}
            variant={'outlined'}
            label={describeColumnMember(member).label}
            onDelete={() => onRemoveMember(member)}
          />
        ))}
        {isLoading && <CircularProgress size={16} />}
      </Box>

      <Box mb={2}>
        <Alert severity={summary.downstream ? 'warning' : 'info'} variant={'outlined'}>
          <MqText>
            {`Changing ${plural(summary.members, 'column')} breaks ${plural(
              summary.downstream,
              'column'
            )} that ${summary.downstream === 1 ? 'reads' : 'read'} ${
              summary.members === 1 ? 'it' : 'them'
            }`}
            {/* Upstream is stated even when nothing breaks: a column with no
                readers still cannot move without what feeds it. */}
            {summary.upstream
              ? `, and depends on ${plural(summary.upstream, 'column')} upstream`
              : ''}
            {'. '}
            {summary.teamsToCoordinate.length
              ? `Coordinate with ${summary.teamsToCoordinate.join(', ')}.`
              : 'No owning team is recorded for the affected columns.'}
          </MqText>
        </Alert>
      </Box>

      <Box display={'flex'} gap={1} mb={1} justifyContent={'flex-end'}>
        <Button
          size={'small'}
          variant={'outlined'}
          startIcon={<FileDownloadOutlined fontSize={'small'} />}
          disabled={!onExportCsv || rows.length === 0}
          onClick={() => onExportCsv?.()}
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

      <ColumnImpactTable
        rows={rows}
        selectedColumn={members[0]}
        filter={filter}
        onFilterChange={onFilterChange}
        title={'Affected columns'}
        extraColumn={{
          label: 'In change',
          render: (row) =>
            (row as ColumnMigrationRow).inSet ? (
              <Chip size={'small'} color={'primary'} variant={'outlined'} label={'changing'} />
            ) : (
              <MqText subdued>—</MqText>
            ),
        }}
      />
    </Box>
  )
}

export default ColumnMigrationPanel
