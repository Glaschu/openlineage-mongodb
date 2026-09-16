// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { useSearchParams } from 'react-router-dom'
import React from 'react'

import { PositionedNode } from '@/features/lineage/components/graph'
import { theme } from '@/shared/theme/theme'
import { truncateText } from '@/shared/utils/text'

export interface TableLineageNamespaceNodeData {
  namespace: string
  datasetCount: number
  jobCount: number
}

interface Props {
  node: PositionedNode<'NAMESPACE', TableLineageNamespaceNodeData>
}

const countLabel = (count: number, singular: string) =>
  `${count} ${count === 1 ? singular : `${singular}s`}`

/**
 * One namespace, standing in for everything inside it. Drawn as a solid node
 * rather than the dashed container used for parent-job grouping, because at
 * this zoom the namespace *is* the node — its contents are not on the canvas.
 */
const TableLineageNamespaceNode = ({ node }: Props) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { namespace, datasetCount, jobCount } = node.data

  const expand = () => {
    const params = new URLSearchParams(searchParams)
    const expanded = new Set((params.get('expandedNamespaces') ?? '').split(',').filter(Boolean))
    expanded.add(namespace)
    params.set('expandedNamespaces', [...expanded].join(','))
    setSearchParams(params)
  }

  return (
    <g onClick={expand} cursor={'pointer'}>
      <rect
        x={0}
        y={0}
        width={node.width}
        height={node.height}
        rx={8}
        fill={theme.palette.background.paper}
        stroke={theme.palette.primary.main}
        strokeWidth={2}
      />
      <text x={12} y={24} fill={theme.palette.text.primary} fontSize={14} fontFamily={'monospace'}>
        {truncateText(namespace, 24)}
      </text>
      <text
        x={12}
        y={42}
        fill={theme.palette.text.secondary}
        fontSize={12}
        fontFamily={'monospace'}
      >
        {`${countLabel(datasetCount, 'dataset')} · ${countLabel(jobCount, 'job')}`}
      </text>
    </g>
  )
}

// Every renderer must expose this: the graph asks each node's renderer for its
// ELK options before layout.
TableLineageNamespaceNode.getLayoutOptions = (node: Props['node']) => ({ ...node })

export default TableLineageNamespaceNode
