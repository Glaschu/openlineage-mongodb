import { ActionBar } from './ActionBar'
import { Box } from '@mui/system'
import { CircularProgress, Drawer } from '@mui/material'
import { DEFAULT_MAX_SCALE, Graph, ZoomPanControls } from '@/features/lineage/components/graph'
import { HEADER_HEIGHT, theme } from '@/shared/theme/theme'
import { JobOrDataset } from '@/shared/types/lineage'
import { TableLevelNodeData, tableLevelNodeRenderer } from './nodes'
import { ZoomControls } from '../column-level/ZoomControls'
import { createElkNodes, findDownstreamNodes, findUpstreamNodes } from './layout'
import { useCallbackRef } from '@/shared/hooks/hooks'
import { useLineage } from '@/features/lineage/api'
import { useParams, useSearchParams } from 'react-router-dom'
import ParentSize from '@visx/responsive/lib/components/ParentSize'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import TableLevelDrawer from './TableLevelDrawer'

const zoomInFactor = 1.5
const zoomOutFactor = 1 / zoomInFactor

// Full-size dataset cards carry one row per column, so a handful of wide
// tables is already several screens of text. Measure the content the graph
// would draw rather than counting nodes: 17 nodes of a 90-column table is just
// as unreadable as 60 small ones.
const AUTO_COMPACT_HEIGHT_BUDGET_PX = 2500

const totalNodeHeight = (nodes: { height?: number; children?: unknown[] }[]): number =>
  nodes.reduce(
    (total, node) =>
      total +
      (node.height ?? 0) +
      totalNodeHeight((node.children ?? []) as { height?: number; children?: unknown[] }[]),
    0
  )

const ColumnLevel = () => {
  const { nodeType, namespace, name } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const [depth, setDepth] = useState(Number(searchParams.get('depth')) || 2)

  const [isCompact, setIsCompact] = useState(searchParams.get('isCompact') === 'true')
  // Only auto-compact while the user has expressed no preference.
  const isCompactExplicit = searchParams.has('isCompact')
  const [isFull, setIsFull] = useState(searchParams.get('isFull') === 'true')
  const [aggregateByParent, setAggregateByParent] = useState(
    searchParams.get('aggregateByParent') === 'true'
  )

  const graphControls = useRef<ZoomPanControls>()

  // The node the pointer is over. Hovering focuses everything reachable from it
  // in either direction and dims the rest, which is the only way to read a
  // single lineage path out of a graph with hundreds of nodes.
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  const collapsedNodes = searchParams.get('collapsedNodes')

  const {
    data: lineage,
    isFetching,
    refetch,
  } = useLineage(nodeType as JobOrDataset, namespace || '', name || '', depth, aggregateByParent)

  const setGraphControls = useCallbackRef((zoomControls) => {
    graphControls.current = zoomControls
  })

  const { nodes, edges, autoCompacted } = useMemo(() => {
    if (!lineage) return { nodes: [], edges: [], autoCompacted: false }

    const build = (compact: boolean) =>
      createElkNodes(
        lineage,
        `${nodeType}:${namespace}:${name}`,
        compact,
        isFull,
        collapsedNodes,
        aggregateByParent
      )

    const built = build(isCompact)
    if (
      !isCompact &&
      !isCompactExplicit &&
      totalNodeHeight(built.nodes) > AUTO_COMPACT_HEIGHT_BUDGET_PX
    ) {
      return { ...build(true), autoCompacted: true }
    }
    return { ...built, autoCompacted: false }
  }, [
    lineage,
    nodeType,
    namespace,
    name,
    isCompact,
    isCompactExplicit,
    isFull,
    collapsedNodes,
    aggregateByParent,
  ])

  const highlight = useMemo(() => {
    if (!hoveredNodeId || !lineage) return null

    const downstream = findDownstreamNodes(lineage, hoveredNodeId, aggregateByParent)
    const upstream = findUpstreamNodes(lineage, hoveredNodeId, aggregateByParent)
    const nodeIds = new Set([
      ...downstream.nodes.map((node) => node.id),
      ...upstream.nodes.map((node) => node.id),
    ])

    // Group containers are not part of the lineage graph, so hovering one
    // resolves to nothing; leave the graph undimmed rather than blanking it.
    if (!nodeIds.size) return null

    return {
      nodeIds,
      edgeIds: new Set([...downstream.edges, ...upstream.edges]),
    }
  }, [hoveredNodeId, lineage, aggregateByParent])

  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        graphControls.current?.fitContent()
      }, 300)
    }
  }, [nodes.length, isCompact])

  if (!lineage) {
    return <div />
  }

  const handleScaleZoom = (inOrOut: 'in' | 'out') => {
    graphControls.current?.scaleZoom(inOrOut === 'in' ? zoomInFactor : zoomOutFactor)
  }

  const handleResetZoom = () => {
    graphControls.current?.fitContent()
  }

  const handleCenterOnNode = () => {
    graphControls.current?.centerOnPositionedNode(
      `${nodeType}:${namespace}:${name}`,
      DEFAULT_MAX_SCALE
    )
  }

  return (
    <>
      <ActionBar
        nodeType={nodeType?.toUpperCase() as JobOrDataset}
        refresh={refetch}
        depth={depth}
        setDepth={setDepth}
        isCompact={isCompact || autoCompacted}
        setIsCompact={setIsCompact}
        isCompactAutomatic={autoCompacted}
        isFull={isFull}
        setIsFull={setIsFull}
        aggregateByParent={aggregateByParent}
        setAggregateByParent={setAggregateByParent}
      />
      <Box height={`calc(100vh - ${HEADER_HEIGHT}px - ${HEADER_HEIGHT}px - 1px)`}>
        {isFetching && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '8px 16px',
              borderRadius: '20px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <CircularProgress size={20} color='inherit' sx={{ mr: 1, color: 'white' }} />
            <span style={{ color: 'white', fontSize: '0.875rem' }}>Loading...</span>
          </Box>
        )}
        <Drawer
          anchor={'right'}
          open={!!searchParams.get('tableLevelNode')}
          onClose={() => setSearchParams({})}
          PaperProps={{
            sx: {
              backgroundColor: theme.palette.background.default,
              backgroundImage: 'none',
              mt: `${HEADER_HEIGHT}px`,
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
            },
          }}
        >
          <Box>
            <TableLevelDrawer lineageGraph={lineage} />
          </Box>
        </Drawer>
        <ZoomControls
          handleCenterOnNode={handleCenterOnNode}
          handleScaleZoom={handleScaleZoom}
          handleResetZoom={handleResetZoom}
        />
        <ParentSize>
          {(parent) => (
            <Graph<JobOrDataset | 'GROUP', TableLevelNodeData>
              id='column-level-graph'
              backgroundColor={theme.palette.background.default}
              height={parent.height}
              width={parent.width}
              nodes={nodes}
              edges={edges}
              direction='right'
              nodeRenderers={tableLevelNodeRenderer}
              setZoomPanControls={setGraphControls}
              highlight={highlight}
              onNodeHover={setHoveredNodeId}
            />
          )}
        </ParentSize>
      </Box>
    </>
  )
}

export default ColumnLevel
