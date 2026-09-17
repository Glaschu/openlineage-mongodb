import { ColumnLineageColumnNodeData } from './nodes'
import { PositionedNode } from '@/features/lineage/components/graph'
import { grey } from '@mui/material/colors'
import { theme } from '@/shared/theme/theme'
import { truncateText } from '@/shared/utils/text'
import { useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import React from 'react'

interface ColumnLineageColumnNodeProps {
  node: PositionedNode<'column', ColumnLineageColumnNodeData>
}

export const encodeQueryString = (namespace: string, dataset: string, column: string) => {
  return `datasetField:${namespace}:${dataset}:${column}`
}

const ColumnLineageColumnNode = ({ node }: ColumnLineageColumnNodeProps) => {
  const [, setSearchParams] = useSearchParams()
  const [shine, setShine] = React.useState(false)

  const { selected, dimmed } = node.data

  const select = (openDrawer: boolean) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('dataset', node.data.dataset)
      next.set('namespace', node.data.namespace)
      next.set(
        'column',
        encodeQueryString(node.data.namespace, node.data.dataset, node.data.column)
      )
      next.set('columnName', node.data.column)
      if (openDrawer) next.set('drawer', 'open')
      return next
    })

  // A click selects and nothing more. Opening the details drawer is a separate,
  // deliberate act: the button in the action bar, or the dataset title. Binding
  // it to selection is what made the drawer appear unbidden.
  const handleSelect = () => select(false)

  return (
    <g opacity={dimmed && !shine ? 0.3 : 1}>
      <Box
        onMouseEnter={() => setShine(true)}
        onMouseLeave={() => setShine(false)}
        onClick={handleSelect}
        component={'rect'}
        sx={{
          x: 0,
          y: 0,
          width: node.width,
          height: node.height,
          stroke: selected ? theme.palette.primary.main : grey['100'],
          strokeWidth: selected ? 2 : 1,
          rx: 4,
          fill: grey['900'],
          cursor: 'pointer',
          filter: shine
            ? 'drop-shadow( 0 0 4px white)'
            : selected
            ? `drop-shadow( 0 0 4px ${theme.palette.primary.main})`
            : 'none',
          transition: 'filter 0.3',
        }}
      />
      <text
        onMouseEnter={() => setShine(true)}
        onMouseLeave={() => setShine(false)}
        onClick={handleSelect}
        x={8}
        y={16}
        textAnchor='start'
        fontSize={12}
        cursor={'pointer'}
        stroke={selected ? theme.palette.primary.main : grey[400]}
      >
        {truncateText(node.data.column, 25)}
      </text>
    </g>
  )
}

ColumnLineageColumnNode.getLayoutOptions = (node: ColumnLineageColumnNodeProps['node']) => ({
  ...node,
})

export default ColumnLineageColumnNode
