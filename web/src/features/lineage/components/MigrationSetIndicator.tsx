// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import PlaylistAddCheck from '@mui/icons-material/PlaylistAddCheck'
import React from 'react'

import { RootState } from '@/store/store'
import { describeColumnMember } from '@/features/lineage/components/column-level/columnMigration'
import { describeMember } from '@/features/lineage/components/table-level/migrationSet'
import MQTooltip from '@/shared/components/MqTooltip/MQTooltip'

/**
 * Shows that a change is being planned, from anywhere in the app.
 *
 * The set survives navigation, so without this it could be accumulating
 * invisibly. Objects and columns are counted separately because their plans
 * live on different pages — one chip that led to only one of them would be
 * lying about half its count.
 */
export const MigrationSetIndicator = () => {
  const members = useSelector((state: RootState) => state.migration.members)
  const columnMembers = useSelector((state: RootState) => state.migration.columnMembers)
  const navigate = useNavigate()

  if (!members.length && !columnMembers.length) return null

  const openPlan = () => {
    const { type, namespace, name } = describeMember(members[0])
    navigate(
      `/lineage/${encodeURIComponent(type)}/${encodeURIComponent(namespace)}/${encodeURIComponent(
        name
      )}?view=migration`
    )
  }

  const openColumnPlan = () => {
    const { namespace, dataset } = describeColumnMember(columnMembers[0])
    navigate(
      `/datasets/column-level/${encodeURIComponent(namespace)}/${encodeURIComponent(
        dataset
      )}?view=migration`
    )
  }

  return (
    <Box display={'flex'} alignItems={'center'} gap={1} mr={2}>
      {members.length > 0 && (
        <MQTooltip title={'Open the migration plan for these objects'}>
          <Chip
            size={'small'}
            color={'primary'}
            variant={'outlined'}
            icon={<PlaylistAddCheck fontSize={'small'} />}
            label={`Migration set (${members.length})`}
            onClick={openPlan}
          />
        </MQTooltip>
      )}
      {columnMembers.length > 0 && (
        <MQTooltip title={'Open the plan for these column changes'}>
          <Chip
            size={'small'}
            color={'primary'}
            variant={'outlined'}
            icon={<PlaylistAddCheck fontSize={'small'} />}
            label={`Columns (${columnMembers.length})`}
            onClick={openColumnPlan}
          />
        </MQTooltip>
      )}
    </Box>
  )
}

export default MigrationSetIndicator
