// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import React from 'react'

import { HoveredEdge } from '@/features/lineage/components/graph'
import { LineageJob, LineageNode } from '@/shared/types/lineage'
import { formatUpdatedAt } from '@/shared/utils'
import { runStateColor } from '@/shared/utils/nodes'
import MqStatus from '@/shared/components/MqStatus/MqStatus'
import MqText from '@/shared/components/MqText/MqText'
import PointerCard from '@/shared/components/PointerCard/PointerCard'

interface Props {
  edge: HoveredEdge
  nodesById: Map<string, LineageNode>
}

/** Node ids are `{type}:{namespace}:{name}`, and names may contain colons. */
export const parseNodeId = (nodeId: string) => {
  const [type, namespace, ...rest] = nodeId.split(':')
  return { type, namespace, name: rest.join(':') }
}

const Endpoint = ({ nodeId, node }: { nodeId: string; node?: LineageNode }) => {
  const theme = useTheme()
  const parsed = parseNodeId(nodeId)
  const job = node?.type === 'JOB' ? (node.data as LineageJob) : undefined

  return (
    <Box>
      <MqText subdued font={'mono'}>
        {`${parsed.type.toUpperCase()} · ${parsed.namespace}`}
      </MqText>
      <MqText font={'mono'}>{parsed.name}</MqText>
      {job && (
        <Box display={'flex'} alignItems={'center'} gap={1} mt={0.5}>
          <MqStatus
            label={job.latestRun?.state || 'N/A'}
            color={
              job.latestRun?.state
                ? runStateColor(job.latestRun.state)
                : theme.palette.secondary.main
            }
          />
          {job.updatedAt && <MqText subdued>{formatUpdatedAt(job.updatedAt)}</MqText>}
        </Box>
      )}
    </Box>
  )
}

/**
 * Names both ends of a table-level edge in full.
 *
 * Node labels in the graph are truncated — badly so in compact mode, which
 * large graphs now default to — and an edge here means "this job reads this
 * dataset" or "this job writes it", so the job's last run is the provenance
 * worth showing alongside.
 */
export const EdgeProvenance = ({ edge, nodesById }: Props) => {
  return (
    <PointerCard data-testid='table-edge-provenance' clientX={edge.clientX} clientY={edge.clientY}>
      <Endpoint nodeId={edge.sourceNodeId} node={nodesById.get(edge.sourceNodeId)} />
      <Box my={0.5}>
        <MqText subdued>↓</MqText>
      </Box>
      <Endpoint nodeId={edge.targetNodeId} node={nodesById.get(edge.targetNodeId)} />
    </PointerCard>
  )
}

export default EdgeProvenance
