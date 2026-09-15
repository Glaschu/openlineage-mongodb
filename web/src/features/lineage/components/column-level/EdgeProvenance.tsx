// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Box, Chip } from '@mui/material'
import React from 'react'

import { ColumnTransformation, transformationKey } from './columnLineageUtils'
import { HoveredEdge } from '@/features/lineage/components/graph'
import { parseColumnLineageNode } from './layout'
import MqText from '@/shared/components/MqText/MqText'
import PointerCard from '@/shared/components/PointerCard/PointerCard'

interface Props {
  edge: HoveredEdge
  transformations: Map<string, ColumnTransformation>
  /** The dataset whose columnLineage facet was loaded, if any. */
  centerDataset?: { namespace: string; name: string } | null
}

/**
 * Names the two columns an edge connects, and how the value was derived when
 * that is known.
 *
 * Edges in the column lineage response carry origin and destination only, so
 * transformation metadata comes from the focused dataset's columnLineage facet
 * and exists for edges into that dataset. For any other edge we say the
 * transformation is not loaded rather than implying there is none.
 */
export const EdgeProvenance = ({ edge, transformations, centerDataset }: Props) => {
  const source = parseColumnLineageNode(edge.sourceNodeId)
  const target = parseColumnLineageNode(edge.targetNodeId)
  const transformation = transformations.get(transformationKey(source, target))

  const targetsCenterDataset =
    !!centerDataset &&
    target.namespace === centerDataset.namespace &&
    target.dataset === centerDataset.name

  return (
    <PointerCard
      data-testid='edge-provenance'
      clientX={edge.clientX}
      clientY={edge.clientY}
      maxWidth={380}
    >
      <MqText subdued font={'mono'}>
        {source.namespace}
      </MqText>
      <MqText font={'mono'}>{`${source.dataset}.${source.column}`}</MqText>

      <Box display={'flex'} alignItems={'center'} gap={1} my={0.5}>
        <MqText subdued>↓</MqText>
        {transformation?.type ? (
          <Chip size={'small'} color={'primary'} variant={'outlined'} label={transformation.type} />
        ) : (
          <MqText subdued>
            {targetsCenterDataset
              ? 'No transformation recorded'
              : 'Transformation not loaded for this dataset'}
          </MqText>
        )}
      </Box>

      <MqText subdued font={'mono'}>
        {target.namespace}
      </MqText>
      <MqText font={'mono'}>{`${target.dataset}.${target.column}`}</MqText>

      {transformation?.description && (
        <Box mt={1}>
          <MqText subdued>{transformation.description}</MqText>
        </Box>
      )}
    </PointerCard>
  )
}

export default EdgeProvenance
