import 'reactflow/dist/style.css'

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import useSize from '@react-hook/size'

import { zoomIdentity } from 'd3-zoom'
import Box from '@mui/system/Box'
import LinearProgress from '@mui/material/LinearProgress'
import ReactFlow, {
  BackgroundVariant,
  ConnectionMode,
  Edge as FlowEdge,
  EdgeProps as FlowEdgeProps,
  Node as FlowNode,
  NodeProps as FlowNodeProps,
  Handle,
  Position,
  Background as ReactFlowBackground,
  ReactFlowProvider,
  useReactFlow,
  useStore,
} from 'reactflow'

import {
  DEFAULT_MAX_SCALE,
  ZoomPanControls,
  clamp as clampZoom,
  getNodeExtent,
} from './ZoomPanSvg/ZoomPanSvg'
import { Edge as EdgeComponent } from './Edge'
import { MiniMap, MiniMapPlacement } from './ZoomPanSvg/MiniMap'
import { Node as NodeComponent } from './Node'
import { useLayout } from './layout/useLayout'
import type { Direction, Edge, Node, NodeRenderer, PositionedEdge, PositionedNode } from './types'

const MINIMAP_SCALE = 1 / 8

interface Props<K, D> {
  id: string
  nodes: Node<K, D>[]
  edges: Edge[]
  direction?: Direction
  webWorkerUrl?: string
  miniMapPlacement?: MiniMapPlacement
  nodeRenderers: Map<K, NodeRenderer<K, D>>
  width?: number
  height?: number
  maxScale?: number
  minScaleMinimum?: number
  containerPadding?: number
  emptyMessage?: string
  hideDotGrid?: boolean
  backgroundColor?: string
  dotGridColor?: string
  disableZoomPan?: boolean
  setZoomPanControls?: (controls: ZoomPanControls) => void
}

type GraphNodeData = {
  positionedNode: PositionedNode<any, any>
  nodeRenderers: Map<any, NodeRenderer<any, any>>
}

type GraphEdgeData = {
  positionedEdge: PositionedEdge
}

const HIDDEN_HANDLE_STYLE: React.CSSProperties = { opacity: 0, pointerEvents: 'none' }

const GraphNodeComponent = ({ data }: FlowNodeProps<GraphNodeData>) => {
  const { positionedNode, nodeRenderers } = data
  const Renderer = nodeRenderers.get(positionedNode.kind)

  if (!Renderer) {
    return null
  }

  return (
    <>
      <Handle id='input' type='target' position={Position.Left} style={HIDDEN_HANDLE_STYLE} />
      <Handle id='output' type='source' position={Position.Right} style={HIDDEN_HANDLE_STYLE} />
      <svg
        width={positionedNode.width}
        height={positionedNode.height}
        style={{ overflow: 'visible' }}
      >
        <Renderer node={positionedNode} />
      </svg>
    </>
  )
}

const GraphEdgeComponent = ({ data }: FlowEdgeProps<GraphEdgeData>) => {
  const positionedEdge = data?.positionedEdge

  if (!positionedEdge) {
    return null
  }

  return (
    <g className='react-flow__edge-path'>
      <EdgeComponent edge={positionedEdge} />
    </g>
  )
}

const NODE_TYPES = { graphNode: GraphNodeComponent }
const EDGE_TYPES = { graphEdge: GraphEdgeComponent }

interface FlattenedNode<K, D> {
  node: PositionedNode<K, D>
  parentId?: string
  relativePosition: { x: number; y: number }
  absolutePosition: { x: number; y: number }
}

const flattenNodes = <K, D>(
  nodes: PositionedNode<K, D>[] = [],
  parent?: PositionedNode<K, D>,
  parentAbsolute: { x: number; y: number } = { x: 0, y: 0 }
): FlattenedNode<K, D>[] => {
  return nodes.flatMap((node) => {
    const relativePosition = { ...node.bottomLeftCorner }
    const absolutePosition = {
      x: parentAbsolute.x + relativePosition.x,
      y: parentAbsolute.y + relativePosition.y,
    }

    const current: FlattenedNode<K, D> = {
      node,
      parentId: parent?.id,
      relativePosition,
      absolutePosition,
    }
    const children = node.children ? flattenNodes(node.children, node, absolutePosition) : []
    return [current, ...children]
  })
}

interface GraphCanvasProps<K, D> extends Props<K, D> {
  containerWidth: number
  containerHeight: number
  isReady: boolean
}

const GraphCanvas = <K, D>({
  id,
  nodes,
  edges,
  direction,
  webWorkerUrl,
  miniMapPlacement = MiniMapPlacement.BottomLeft,
  nodeRenderers,
  containerWidth,
  containerHeight,
  isReady,
  maxScale = DEFAULT_MAX_SCALE,
  minScaleMinimum,
  containerPadding = 0,
  emptyMessage,
  hideDotGrid = false,
  backgroundColor,
  dotGridColor,
  disableZoomPan = false,
  setZoomPanControls,
}: GraphCanvasProps<K, D>) => {
  const { layout, error, isRendering } = useLayout<K, D>({
    id,
    nodes,
    edges,
    direction: direction ?? 'right',
    keepPreviousGraph: true,
    webWorkerUrl,
    getLayoutOptions: (node: Node<K, D>) =>
      nodeRenderers.get(node.kind)?.getLayoutOptions(node) || node,
  })

  const positionedNodes = layout?.nodes ?? []
  const positionedEdges = layout?.edges ?? []
  const contentWidth = layout?.width ?? 0
  const contentHeight = layout?.height ?? 0

  const minZoom = minScaleMinimum ?? 0.1
  const maxZoom = maxScale

  const reactFlowInstance = useReactFlow()
  const transform = useStore((state) => state.transform)

  const shouldAutoFitRef = useRef(true)
  const prevLayoutKeyRef = useRef<string>()

  useEffect(() => {
    if (error) {
      console.error(error)
    }
  }, [error])

  const flattened = useMemo(
    () => flattenNodes(positionedNodes as PositionedNode<K, D>[]),
    [positionedNodes]
  )

  useEffect(() => {
    if (!positionedNodes.length) return

    const layoutKey = positionedNodes
      .map((node) =>
        [
          node.id,
          node.bottomLeftCorner.x.toFixed(1),
          node.bottomLeftCorner.y.toFixed(1),
          node.width,
          node.height,
        ].join(':')
      )
      .join('|')

    if (layoutKey !== prevLayoutKeyRef.current) {
      prevLayoutKeyRef.current = layoutKey
      shouldAutoFitRef.current = true
    }
  }, [positionedNodes])

  const absoluteNodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    map.set(id, { x: 0, y: 0 })
    map.set('root', { x: 0, y: 0 })
    flattened.forEach(({ node, absolutePosition }) => {
      map.set(node.id, absolutePosition)
    })
    return map
  }, [flattened, id])

  const nodeLookup = useMemo(() => {
    const map = new Map<string, PositionedNode<K, D>>()

    const addToMap = (node: PositionedNode<K, D>) => {
      map.set(node.id, node)
      node.children?.forEach(addToMap)
    }

    positionedNodes.forEach(addToMap)
    return map
  }, [positionedNodes])

  const flowNodes = useMemo<FlowNode<GraphNodeData>[]>(() => {
    return flattened.map(({ node, parentId, relativePosition, absolutePosition }) => {
      const isContainer = Boolean(node.children?.length)

      return {
        id: node.id,
        type: 'graphNode',
        position: {
          x: relativePosition.x,
          y: relativePosition.y,
        },
        positionAbsolute: {
          x: absolutePosition.x,
          y: absolutePosition.y,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        width: node.width,
        height: node.height,
        data: {
          positionedNode: node as PositionedNode<any, any>,
          nodeRenderers: nodeRenderers as Map<any, NodeRenderer<any, any>>,
        },
        draggable: false,
        selectable: false,
        deletable: false,
        connectable: false,
        parentNode: parentId,
        extent: parentId ? 'parent' : undefined,
        zIndex: isContainer ? -1 : 1,
        style: {
          width: node.width,
          height: node.height,
          background: 'transparent',
          border: 'none',
          padding: 0,
          pointerEvents: 'auto',
        },
      }
    })
  }, [flattened, nodeRenderers])

  const adjustedEdges = useMemo(() => {
    const adjustPoint = (point: { x: number; y: number }, containerId?: string) => {
      const offset = (containerId && absoluteNodePositions.get(containerId)) || { x: 0, y: 0 }
      return {
        x: point.x + offset.x,
        y: point.y + offset.y,
      }
    }

    return positionedEdges.map((edge) => ({
      ...edge,
      startPoint: adjustPoint(edge.startPoint, edge.container),
      endPoint: adjustPoint(edge.endPoint, edge.container),
      bendPoints: edge.bendPoints?.map((bendPoint) => adjustPoint(bendPoint, edge.container)),
    }))
  }, [positionedEdges, absoluteNodePositions])

  const flowEdges = useMemo<FlowEdge<GraphEdgeData>[]>(() => {
    return adjustedEdges.map((edge) => ({
      id: edge.id,
      type: 'graphEdge',
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      sourceHandle: 'output',
      targetHandle: 'input',
      selectable: false,
      focusable: false,
      data: { positionedEdge: edge },
      animated: Boolean(edge.isAnimated),
    }))
  }, [adjustedEdges])

  useEffect(() => {
    if (!isReady || !positionedNodes.length || contentWidth <= 0 || contentHeight <= 0) return
    if (!shouldAutoFitRef.current) return

    const hasInvalidDimensions = positionedNodes.some(
      (node) =>
        !Number.isFinite(node.width) ||
        node.width <= 0 ||
        !Number.isFinite(node.height) ||
        node.height <= 0
    )

    if (hasInvalidDimensions) return

    const frame = requestAnimationFrame(() => {
      reactFlowInstance.fitView({ padding: containerPadding, duration: 250 })
      shouldAutoFitRef.current = false
    })

    return () => cancelAnimationFrame(frame)
  }, [reactFlowInstance, positionedNodes, containerPadding, isReady, contentWidth, contentHeight])
  const handleViewportInteraction = useCallback(() => {
    shouldAutoFitRef.current = false
  }, [])

  useEffect(() => {
    if (!setZoomPanControls || !isReady) return

    const centerOnExtent = (extent: [number[], number[]], zoom = reactFlowInstance.getZoom()) => {
      const [min, max] = extent
      const width = containerWidth
      const height = containerHeight
      if (!width || !height) return

      const centerX = min[0] + (max[0] - min[0]) / 2
      const centerY = min[1] + (max[1] - min[1]) / 2
      const x = -centerX * zoom + width / 2
      const y = -centerY * zoom + height / 2

      reactFlowInstance.setViewport({ x, y, zoom })
    }

    const controls: ZoomPanControls = {
      fitContent() {
        reactFlowInstance.fitView({ padding: containerPadding, duration: 250 })
      },
      fitExtent(extent, zoomIn = true) {
        const [min, max] = extent
        const width = max[0] - min[0]
        const height = max[1] - min[1]
        if (width <= 0 || height <= 0) return

        reactFlowInstance.fitBounds(
          { x: min[0], y: min[1], width, height },
          {
            padding: containerPadding,
            duration: 250,
          }
        )
      },
      centerOnExtent,
      scaleZoom(scaleFactor = 1) {
        const currentZoom = reactFlowInstance.getZoom()
        const nextZoom = clampZoom(currentZoom * scaleFactor, minZoom, maxZoom)

        const width = containerWidth
        const height = containerHeight
        if (!width || !height) return

        const centerPoint = reactFlowInstance.project({ x: width / 2, y: height / 2 })
        const x = -centerPoint.x * nextZoom + width / 2
        const y = -centerPoint.y * nextZoom + height / 2

        reactFlowInstance.setViewport({ x, y, zoom: nextZoom })
      },
      resetZoom() {
        reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 })
      },
      centerOnPositionedNode(nodeId, zoom) {
        const node = nodeLookup.get(nodeId)
        if (!node) return

        const absolutePosition = absoluteNodePositions.get(nodeId)
        if (!absolutePosition) return

        const nodeExtent = getNodeExtent({
          ...node,
          bottomLeftCorner: absolutePosition,
        })
        const targetZoom = zoom ?? reactFlowInstance.getZoom()
        centerOnExtent(nodeExtent, targetZoom)
      },
    }

    setZoomPanControls(controls)
  }, [
    setZoomPanControls,
    reactFlowInstance,
    containerPadding,
    minZoom,
    maxZoom,
    containerWidth,
    containerHeight,
    nodeLookup,
    absoluteNodePositions,
    isReady,
  ])

  const zoomTransform = useMemo(() => {
    const [tx, ty, k] = transform

    if (![tx, ty, k].every((value) => Number.isFinite(value)) || k === 0) {
      return zoomIdentity
    }

    return zoomIdentity.translate(tx, ty).scale(k)
  }, [transform])

  const minimapContent = useMemo(() => {
    if (
      miniMapPlacement === MiniMapPlacement.None ||
      containerWidth <= 0 ||
      containerHeight <= 0 ||
      contentWidth <= 0 ||
      contentHeight <= 0 ||
      !Number.isFinite(zoomTransform.k)
    ) {
      return null
    }

    return (
      <MiniMap
        containerWidth={containerWidth}
        containerHeight={containerHeight}
        contentWidth={contentWidth}
        contentHeight={contentHeight}
        miniMapScale={MINIMAP_SCALE}
        zoomTransform={zoomTransform}
        placement={miniMapPlacement}
        sx={{ pointerEvents: 'none' }}
      >
        {positionedNodes.map((node) => (
          <NodeComponent
            key={node.id}
            node={node}
            nodeRenderers={nodeRenderers}
            edges={positionedEdges}
            isMiniMap
          />
        ))}
        {positionedEdges.map((edge) => (
          <EdgeComponent key={edge.id} edge={edge} isMiniMap />
        ))}
      </MiniMap>
    )
  }, [
    miniMapPlacement,
    containerWidth,
    containerHeight,
    contentWidth,
    contentHeight,
    zoomTransform,
    positionedNodes,
    positionedEdges,
    nodeRenderers,
  ])

  const shouldShowEmptyState = !positionedNodes.length && emptyMessage

  return (
    <Box
      position='absolute'
      top={0}
      left={0}
      right={0}
      bottom={0}
      sx={{ bgcolor: backgroundColor }}
    >
      {isReady && (
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          connectionMode={ConnectionMode.Loose}
          onMove={handleViewportInteraction}
          onMoveStart={handleViewportInteraction}
          onMoveEnd={handleViewportInteraction}
          minZoom={minZoom}
          maxZoom={maxZoom}
          zoomOnScroll={!disableZoomPan}
          zoomOnPinch={!disableZoomPan}
          panOnDrag={!disableZoomPan}
          nodesDraggable={false}
          elementsSelectable={false}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
          style={{ width: '100%', height: '100%' }}
        >
          {!hideDotGrid && (
            <ReactFlowBackground color={dotGridColor} variant={BackgroundVariant.Dots} gap={16} />
          )}
        </ReactFlow>
      )}
      {minimapContent}
      {isRendering && (
        <Box position='absolute' bottom={0} left={0} right={0}>
          <LinearProgress />
        </Box>
      )}
      {shouldShowEmptyState && (
        <Box position='absolute' top='50%' left='50%' sx={{ transform: 'translate(-50%, -50%)' }}>
          {emptyMessage}
        </Box>
      )}
    </Box>
  )
}

export const Graph = <K, D>({ width: propWidth, height: propHeight, ...props }: Props<K, D>) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [measuredWidth, measuredHeight] = useSize(containerRef)

  const width = propWidth ?? measuredWidth
  const height = propHeight ?? measuredHeight
  const isReady = Boolean(width && height)

  return (
    <ReactFlowProvider>
      <Box
        ref={containerRef}
        width={propWidth ?? '100%'}
        height={propHeight ?? '100%'}
        position='relative'
      >
        <GraphCanvas
          {...props}
          containerWidth={width || 0}
          containerHeight={height || 0}
          isReady={isReady}
        />
      </Box>
    </ReactFlowProvider>
  )
}
