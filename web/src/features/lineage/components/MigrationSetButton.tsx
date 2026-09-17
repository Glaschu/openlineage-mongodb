// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { useDispatch, useSelector } from 'react-redux'
import IconButton from '@mui/material/IconButton'
import PlaylistAdd from '@mui/icons-material/PlaylistAdd'
import PlaylistAddCheck from '@mui/icons-material/PlaylistAddCheck'
import React from 'react'

import { RootState } from '@/store/store'
import { toggleMigrationMember } from '@/features/lineage/migrationSlice'
import MQTooltip from '@/shared/components/MqTooltip/MQTooltip'

interface Props {
  /** `{type}:{namespace}:{name}`, the id lineage uses. */
  nodeId: string
  /** Shown in the tooltip so the control says what it will act on. */
  label: string
  size?: 'small' | 'medium'
}

/**
 * Adds one object to the migration set from wherever it is listed.
 *
 * A plan is assembled from a list far more often than from one lineage graph
 * at a time, so this belongs next to the rows rather than only in the graph's
 * action bar.
 */
export const MigrationSetButton = ({ nodeId, label, size = 'small' }: Props) => {
  const dispatch = useDispatch()
  const isMember = useSelector((state: RootState) => state.migration.members.includes(nodeId))

  return (
    <MQTooltip
      title={
        isMember ? `Remove ${label} from the migration set` : `Add ${label} to the migration set`
      }
    >
      <IconButton
        size={size}
        color={isMember ? 'primary' : 'default'}
        aria-label={
          isMember ? `remove ${label} from migration set` : `add ${label} to migration set`
        }
        onClick={(event) => {
          // Rows are links; adding to a set is not a request to navigate.
          event.stopPropagation()
          event.preventDefault()
          dispatch(toggleMigrationMember(nodeId))
        }}
      >
        {isMember ? <PlaylistAddCheck fontSize={size} /> : <PlaylistAdd fontSize={size} />}
      </IconButton>
    </MQTooltip>
  )
}

export default MigrationSetButton
