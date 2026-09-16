import { ActionBar, GraphSearchOption } from './ActionBar'
import { Box } from '@mui/material'
import { CircularProgress, Drawer } from '@mui/material'
import {
  DEFAULT_MAX_SCALE,
  Graph,
  HoveredEdge,
  ZoomPanControls,
} from '@/features/lineage/components/graph'
import { HEADER_HEIGHT, theme } from '@/shared/theme/theme'
import { JobOrDataset } from '@/shared/types/lineage'
import {
  TableLevelNodeData,
  TableLineageDatasetNodeData,
  TableLineageJobNodeData,
  tableLevelNodeRenderer,
} from './nodes'
import { ZoomControls } from '../column-level/ZoomControls'
import { buildEvidenceMarkdown, evidenceFilename } from './evidence'
import { buildImpactCsv, buildImpactRows } from './impact'
import { createElkNodes, findDownstreamNodes, findUpstreamNodes } from './layout'
import { downloadBlob } from '@/shared/utils/download'
import { useCallbackRef } from '@/shared/hooks/hooks'
import { useLineage } from '@/features/lineage/api'
import { useParams, useSearchParams } from 'react-router-dom'
import EdgeProvenance from './EdgeProvenance'
import ImpactTable from './ImpactTable'
import MqParentSize from '@/shared/components/MqParentSize/MqParentSize'
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
  const [groupByNamespace, setGroupByNamespace] = useState(
    searchParams.get('groupByNamespace') === 'true'
  )
  const expandedNamespaces = searchParams.get('expandedNamespaces')
  const [view, setView] = useState<'graph' | 'impact'>(
    searchParams.get('view') === 'impact' ? 'impact' : 'graph'
  )
  const [impactFilter, setImpactFilter] = useState('')

  const graphControls = useRef<ZoomPanControls>()

  // The node the pointer is over. Hovering focuses everything reachable from it
  // in either direction and dims the rest, which is the only way to read a
  // single lineage path out of a graph with hundreds of nodes.
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  // A node chosen from the find-a-node box stays focused until it is cleared,
  // so the path survives the pointer leaving the graph.
  const [pinnedNodeId, setPinnedNodeId] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<HoveredEdge | null>(null)

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
        aggregateByParent,
        groupByNamespace,
        expandedNamespaces
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
    groupByNamespace,
    expandedNamespaces,
  ])

  const focusedNodeId = hoveredNodeId ?? pinnedNodeId

  const focusNodeId = `${nodeType}:${namespace}:${name}`

  const impactRows = useMemo(() => buildImpactRows(lineage, focusNodeId), [lineage, focusNodeId])

  const handleExportImpact = useCallbackRef(() => {
    const csv = buildImpactCsv(impactRows)
    downloadBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `impact-${namespace ?? 'unknown'}-${name ?? 'unknown'}.csv`
    )
  })

  const handleExportEvidence = useCallbackRef(() => {
    const capturedAt = new Date()
    const markdown = buildEvidenceMarkdown({
      nodeType: nodeType ?? 'unknown',
      namespace: namespace ?? 'unknown',
      name: name ?? 'unknown',
      depth,
      url: window.location.href,
      rows: impactRows,
      capturedAt,
    })
    downloadBlob(
      new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
      evidenceFilename(namespace ?? 'unknown', name ?? 'unknown', capturedAt)
    )
  })

  const nodesById = useMemo(
    () => new Map((lineage?.graph ?? []).map((node) => [node.id, node])),
    [lineage]
  )

  const searchOptions = useMemo(() => {
    const options: GraphSearchOption[] = []

    const visit = (list: typeof nodes) => {
      for (const node of list) {
        if (node.kind === 'JOB') {
          const { job } = node.data as TableLineageJobNodeData
          options.push({ id: node.id, name: job.name, namespace: job.namespace, kind: 'Jobs' })
        } else if (node.kind === 'DATASET') {
          const { dataset } = node.data as TableLineageDatasetNodeData
          options.push({
            id: node.id,
            name: dataset.name,
            namespace: dataset.namespace,
            kind: 'Datasets',
          })
        }
        if (node.children) visit(node.children)
      }
    }
    visit(nodes)

    // Autocomplete's groupBy expects options already grouped.
    return options.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
  }, [nodes])

  const handleSelectNode = useCallbackRef((nodeId: string | null) => {
    setPinnedNodeId(nodeId)
    if (nodeId) {
      graphControls.current?.centerOnPositionedNode(nodeId, DEFAULT_MAX_SCALE)
    }
  })

  const highlight = useMemo(() => {
    if (!focusedNodeId || !lineage) return null

    const downstream = findDownstreamNodes(lineage, focusedNodeId, aggregateByParent)
    const upstream = findUpstreamNodes(lineage, focusedNodeId, aggregateByParent)
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
  }, [focusedNodeId, lineage, aggregateByParent])

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
        groupByNamespace={groupByNamespace}
        setGroupByNamespace={setGroupByNamespace}
        searchOptions={searchOptions}
        onSelectNode={handleSelectNode}
        view={view}
        setView={setView}
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
        {view === 'impact' ? (
          <ImpactTable
            rows={impactRows}
            filter={impactFilter}
            onFilterChange={setImpactFilter}
            onExport={handleExportImpact}
            onExportEvidence={handleExportEvidence}
          />
        ) : (
          <>
            <ZoomControls
              handleCenterOnNode={handleCenterOnNode}
              handleScaleZoom={handleScaleZoom}
              handleResetZoom={handleResetZoom}
            />
            <MqParentSize>
              {(parent) => (
                <Graph<JobOrDataset | 'GROUP' | 'NAMESPACE', TableLevelNodeData>
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
                  onEdgeHover={setHoveredEdge}
                />
              )}
            </MqParentSize>
          </>
        )}
      </Box>
      {view === 'graph' && hoveredEdge && (
        <EdgeProvenance edge={hoveredEdge} nodesById={nodesById} />
      )}
    </>
  )
}

export default ColumnLevel
