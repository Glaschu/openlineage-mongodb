import { ColumnLineageDatasetNodeData } from './nodes'
import { Icon, faDatabase } from '@/shared/components/icons'
import { PositionedNode } from '@/features/lineage/components/graph'
import { theme } from '@/shared/theme/theme'
import { truncateText } from '@/shared/utils/text'
import { useParams, useSearchParams } from 'react-router-dom'
import Box from '@mui/system/Box'
import React from 'react'

interface ColumnLineageDatasetNodeProps {
  node: PositionedNode<'dataset', ColumnLineageDatasetNodeData>
}
export const ColumnLineageDatasetNode = ({ node }: ColumnLineageDatasetNodeProps) => {
  const [, setSearchParams] = useSearchParams()
  const { namespace, name } = useParams()
  const shine = name === node.data.dataset && namespace === node.data.namespace
  return (
    <>
      <Box
        id={node.id}
        component={'rect'}
        sx={{
          x: 0,
          y: 0,
          width: node.width,
          height: node.height,
          fill: theme.palette.background.paper,
          strokeWidth: 1,
          rx: 4,
          filter: shine ? `drop-shadow( 0 0 4px ${theme.palette.primary.main})` : 'none',
        }}
      />
      <Box
        component={'rect'}
        sx={{
          x: 0,
          y: 0,
          width: 2,
          height: node.height,
          fill: theme.palette.primary.main,
          strokeWidth: 1,
          rx: 4,
        }}
      />
      <text
        x={16}
        y={24}
        textAnchor='start'
        fontSize={14}
        stroke={'white'}
        cursor={'pointer'}
        onClick={() =>
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('dataset', node.data.dataset)
            next.set('namespace', node.data.namespace)
            return next
          })
        }
      >
        {`${truncateText(node.data.dataset, 25)}`}
      </text>
      <Icon
        x={node.width - 24}
        y={12}
        width={16}
        height={16}
        color={theme.palette.primary.main}
        icon={faDatabase}
      />
    </>
  )
}

ColumnLineageDatasetNode.getLayoutOptions = (node: ColumnLineageDatasetNodeProps['node']) => {
  return {
    ...node,
    padding: { left: 16, top: 40, right: 40, bottom: 16 },
  }
}
