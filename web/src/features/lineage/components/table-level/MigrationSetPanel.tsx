// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Alert, Box, Button, Chip, CircularProgress } from '@mui/material'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import React from 'react'

import { ImpactTable } from './ImpactTable'
import { MigrationSetRow, MigrationSummary, describeMember } from './migrationSet'
import MqEmpty from '@/shared/components/MqEmpty/MqEmpty'
import MqText from '@/shared/components/MqText/MqText'

interface Props {
  members: string[]
  rows: MigrationSetRow[]
  summary: MigrationSummary
  isLoading: boolean
  filter: string
  onFilterChange: (filter: string) => void
  onRemoveMember: (nodeId: string) => void
  onExportCsv?: () => void
  onExportEvidence?: () => void
}

/**
 * The plan view for a move: what is going, what it drags along, and who has to
 * be asked.
 */
export const MigrationSetPanel = ({
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
        <MqEmpty title={'No migration set'}>
          <MqText subdued>
            Add objects with &ldquo;Add to migration set&rdquo; to see the blast radius of moving
            them together: what depends on the set, what the set already contains, and which teams
            have to be involved.
          </MqText>
        </MqEmpty>
      </Box>
    )
  }

  return (
    <Box px={2} py={2} height={'100%'} overflow={'auto'}>
      <Box display={'flex'} alignItems={'center'} gap={2} mb={1} flexWrap={'wrap'}>
        <MqText heading>Migration set</MqText>
        {members.map((member) => {
          const { name, namespace } = describeMember(member)
          return (
            <Chip
              key={member}
              size={'small'}
              color={'primary'}
              variant={'outlined'}
              label={`${namespace}.${name}`}
              onDelete={() => onRemoveMember(member)}
            />
          )
        })}
        {isLoading && <CircularProgress size={16} />}
      </Box>

      <Box mb={2}>
        <Alert severity={summary.unclaimedExternal ? 'warning' : 'info'} variant={'outlined'}>
          <MqText>
            {`Moving ${summary.members} object${summary.members === 1 ? '' : 's'} touches ${
              summary.external
            } outside the set`}
            {summary.internal
              ? `, and ${summary.internal} dependenc${
                  summary.internal === 1 ? 'y is' : 'ies are'
                } already inside it`
              : ''}
            {'. '}
            {summary.teamsToCoordinate.length
              ? `Coordinate with ${summary.teamsToCoordinate.join(', ')}. `
              : ''}
            {summary.unclaimedExternal
              ? `${summary.unclaimedExternal} affected object${
                  summary.unclaimedExternal === 1 ? '' : 's'
                } sit in unclaimed namespaces with nobody to consult.`
              : ''}
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

      <ImpactTable
        rows={rows}
        filter={filter}
        onFilterChange={onFilterChange}
        title={'Affected by this move'}
        extraColumn={{
          label: 'In set',
          render: (row) =>
            (row as MigrationSetRow).inSet ? (
              <Chip size={'small'} color={'primary'} variant={'outlined'} label={'moving'} />
            ) : (
              <MqText subdued>—</MqText>
            ),
        }}
      />
    </Box>
  )
}

export default MigrationSetPanel
