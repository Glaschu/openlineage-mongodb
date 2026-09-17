// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Chip from '@mui/material/Chip'
import PlaylistAddCheck from '@mui/icons-material/PlaylistAddCheck'
import React from 'react'

import { RootState } from '@/store/store'
import { describeMember } from '@/features/lineage/components/table-level/migrationSet'
import MQTooltip from '@/shared/components/MqTooltip/MQTooltip'

/**
 * Shows that a migration set is being built, from anywhere in the app.
 *
 * The set survives navigation, so without this it could be accumulating
 * invisibly; it appears only once something is in it.
 */
export const MigrationSetIndicator = () => {
  const members = useSelector((state: RootState) => state.migration.members)
  const navigate = useNavigate()

  if (!members.length) return null

  const openPlan = () => {
    const { type, namespace, name } = describeMember(members[0])
    navigate(
      `/lineage/${encodeURIComponent(type)}/${encodeURIComponent(namespace)}/${encodeURIComponent(
        name
      )}?view=migration`
    )
  }

  return (
    <MQTooltip title={'Open the migration plan for this set'}>
      <Chip
        size={'small'}
        color={'primary'}
        variant={'outlined'}
        icon={<PlaylistAddCheck fontSize={'small'} />}
        label={`Migration set (${members.length})`}
        onClick={openPlan}
        sx={{ mr: 2 }}
      />
    </MQTooltip>
  )
}

export default MigrationSetIndicator
