import { useEffect, useMemo, useRef, useState } from 'react'

// elk-api is the thin (12 kB) client; the layout algorithm itself lives in the
// worker. Importing 'elkjs' instead pulls elk.bundled.js — the entire 1.4 MB
// algorithm — into the main bundle where it is never executed.
import ELK from 'elkjs/lib/elk-api'
import type { ElkNode } from 'elkjs/lib/elk-api'

import { deepEqual } from '@/shared/utils/deepEqual'
import { useCallbackRef } from '../utils/hooks'
import type { Direction, Edge, Node, NodeRenderer, PositionedEdge, PositionedNode } from '../types'

// Import the worker file as a URL - Vite will handle bundling it
import elkWorkerUrl from 'elkjs/lib/elk-worker.min.js?url'

// One ELK client (and therefore one worker) per worker URL, shared by every
// graph on the page. Creating one per layout meant the browser re-parsed and
// re-initialised 1.4 MB of worker script on every expand, collapse or depth
// change.
const elkClients = new Map<string, InstanceType<typeof ELK>>()

const getElkClient = (workerUrl: string): InstanceType<typeof ELK> => {
  let client = elkClients.get(workerUrl)
  if (!client) {
    client = new ELK({ workerFactory: () => new Worker(workerUrl, { type: 'classic' }) })
    elkClients.set(workerUrl, client)
  }
  return client
}

export const EDGE_LABEL_FONT_SIZE = 12
export const EDGE_LABEL_HEIGHT = 16
/**
 * Mean glyph advance for the label font at EDGE_LABEL_FONT_SIZE. Measured at
 * 6.0px in the browser; kept generous so ELK over-reserves rather than letting
 * labels on parallel edges collide.
 */
export const EDGE_LABEL_CHAR_WIDTH = 7

export interface Props<K, D> {
  id?: string
  nodes: Node<K, D>[]
  edges: Edge[]
  direction?: Direction
  keepPreviousGraph?: boolean
  webWorkerUrl?: string
  getLayoutOptions?: NodeRenderer<K, D>['getLayoutOptions']
}

interface Output<K, D> {
  layout?: {
    nodes: PositionedNode<K, D>[]
    edges: PositionedEdge[]
    height: number
    width: number
  }
  error?: any
  isRendering: boolean
}

const positionNodes = <K, D>(nodes: Node<K, D>[], elkOutput: ElkNode[]) => {
  // Index once instead of scanning elkOutput for every node (was O(n^2)).
  const elkById = new Map<string, ElkNode>()
  for (const child of elkOutput ?? []) elkById.set(child.id, child)

  return nodes.reduce<PositionedNode<K, D>[]>((acc, node) => {
    const elkNode = elkById.get(node.id)
    if (!elkNode) return acc
    const { x, y, height, width } = elkNode
    // x/y of 0 are valid coordinates, so test for finiteness rather than
    // truthiness — a falsy check silently dropped nodes laid out at the origin.
    if (!Number.isFinite(x) || !Number.isFinite(y)) return acc
    if (!height || !width) return acc

    acc.push({
      ...node,
      height,
      width,
      bottomLeftCorner: {
        x: x as number,
        y: y as number,
      },
      children:
        node.children && elkNode.children
          ? positionNodes<K, D>(node.children, elkNode.children)
          : undefined,
    })
    return acc
  }, [])
}

const addLayoutOptions = <K, D>(
  nodes: Node<K, D>[],
  getLayoutOptions: (node: Node<K, D>) => Node<K, D>
): Node<K, D>[] =>
  nodes.map((n) => {
    const newNode = getLayoutOptions(n) // getLayoutOptions() may remove children
    return {
      ...newNode,
      children: newNode.children ? addLayoutOptions(newNode.children, getLayoutOptions) : undefined,
    }
  })

export const useLayout = <K, D>({
  id: rootId = 'root',
  nodes: nodesWithoutRenderOptions,
  edges,
  direction = 'right',
  keepPreviousGraph: keepPreviousLayout = false,
  webWorkerUrl = elkWorkerUrl,
  getLayoutOptions = (node) => node,
}: Props<K, D>): Output<K, D> => {
  /* STATE */
  // Layout is stored in a ref to support `keepPreviousGraph`.
  const layoutRef = useRef<Output<K, D>['layout']>()

  // The graph we want rendered in the layout.
  const elkInputRef = useRef<ElkNode>()

  // After the elk async layout completes, it stores the root node.
  const [elkOutput, setElkOutput] = useState<ElkNode>()
  const [error, setError] = useState<any>()

  // The graph that was last rendered by elk. Used to determine when rendering is complete.
  const [elkRenderedInput, setElkRenderedInput] = useState<ElkNode>()

  // Assuming that if getLayoutOptions changes, it shouldn't cause a render. This creates static dependency for useMemo.
  const getLayoutOptionsRef = useCallbackRef(getLayoutOptions)

  const nodes = useMemo(
    () => addLayoutOptions(nodesWithoutRenderOptions, getLayoutOptionsRef),
    [nodesWithoutRenderOptions, getLayoutOptionsRef]
  )

  /* ELK INPUT (GRAPH) UPDATES */
  /* update the elkInput graph or keep the version last stored on the ref
   * nodes may include may data state changes that do not affect layout.
   */
  const elkInput = useMemo(() => {
    const layoutOptions = {
      'elk.interactiveLayout': 'false',
      'elk.algorithm': 'layered',
      'elk.separateConnectedComponents': 'false',
      'elk.direction': direction.toUpperCase(),
      'org.eclipse.elk.layered.nodePlacement.bk.edgeStraightening': 'NONE',
      'org.eclipse.elk.layered.edgeRouting.splines.mode': 'SLOPPY',
      'cycleBreaking.strategy': 'INTERACTIVE',
      'elk.layered.nodePlacement.strategy': 'STRETCH_WIDTH',
      'portAlignment.default': 'CENTER',
      'layered.layering.strategy': 'COFFMAN_GRAHAM',
      'layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'nodeSize.options': 'SPACE_EFFICIENT_PORT_LABELS',
      'layered.mergeEdges': 'false',
      contentAlignment: 'V_CENTER',
      'crossingMinimization.semiInteractive': 'false',
      hierarchyHandling: 'INCLUDE_CHILDREN',
      'nodeLabels.placement': '[H_CENTER, V_TOP, INSIDE]',
    }

    const mapNode = ({ id, width, height, padding, children }: Node<K, D>): ElkNode => ({
      id,
      width: width ?? 0,
      height: height ?? 0,
      children: children ? children.map(mapNode) : undefined,
      layoutOptions: padding
        ? {
            'elk.padding': `[left=${padding.left}, top=${padding.top}, right=${padding.right}, bottom=${padding.bottom}]`,
          }
        : undefined,
    })
    const newElkInput = {
      id: rootId,
      layoutOptions,
      children: nodes.map(mapNode),
      edges: edges.map((edge) => ({
        id: edge.id,
        sources: [edge.sourceNodeId],
        targets: [edge.targetNodeId],
        labels: edge.label
          ? [
              {
                // Ids must be unique: two edges labelled "1 connection" would
                // otherwise share one, and ELK places labels by id.
                id: `${edge.id}:label`,
                text: edge.label,
                height: EDGE_LABEL_HEIGHT,
                // Approximates the rendered width at EDGE_LABEL_FONT_SIZE; ELK
                // reserves this much room, so underestimating overlaps labels
                // on parallel edges.
                width: edge.label.length * EDGE_LABEL_CHAR_WIDTH,
              },
            ]
          : [],
      })),
    }

    // If the graph hasn't changed, don't update the object to prevent useEffect triggering.
    if (elkInputRef.current && deepEqual(newElkInput, elkInputRef.current)) {
      return elkInputRef.current
    }

    // If the graph has changed store it on the ref and return the new value.
    elkInputRef.current = newElkInput
    return newElkInput
  }, [rootId, nodes, edges, direction])

  /* EFFECTS */
  // Render
  useEffect(() => {
    // The worker is shared, so an in-flight layout cannot be cancelled by
    // terminating it. Ignore its result instead: only the newest request is
    // allowed to write state.
    let isCurrent = true

    getElkClient(webWorkerUrl)
      .layout(elkInput)
      .then((rootNode) => {
        if (!isCurrent) return
        setElkRenderedInput(elkInput)
        setElkOutput(rootNode)
        setError(undefined)
      })
      .catch((err) => {
        if (!isCurrent) return
        setElkRenderedInput(elkInput)
        setElkOutput(undefined)
        setError(err)
      })

    return () => {
      isCurrent = false
    }
  }, [elkInput, webWorkerUrl])

  /* RETURN VALUES */

  // If the `elkInput` matches the `elkRenderedInput`, then rendering is complete.
  const isRendering = !(elkOutput || error) || elkRenderedInput !== elkInput

  // combined the nodes and edge inputs with the elk output
  const layout = useMemo(() => {
    // if elk is updating, return the last layout value or undefined
    if (isRendering) return keepPreviousLayout ? layoutRef.current : undefined

    // if there are no child nodes, there is no layout
    if (!elkOutput?.children)
      return {
        nodes: [],
        edges: [],
        height: elkOutput?.height || 0,
        width: elkOutput?.width || 0,
      }

    const newNodes = positionNodes(nodes, elkOutput.children)

    const elkEdgeById = new Map<string, NonNullable<ElkNode['edges']>[number]>()
    for (const elkEdge of elkOutput.edges ?? []) elkEdgeById.set(elkEdge.id, elkEdge)

    const newEdges = edges.reduce<PositionedEdge[]>((acc, edge) => {
      const elkEdge = elkEdgeById.get(edge.id)
      if (!elkEdge?.sections?.[0]) return acc
      const section = elkEdge.sections[0]

      acc.push({
        ...edge,
        // @ts-expect-error container is an undocumented property, but it's necessary for render.
        container: elkEdge.container,
        startPoint: section.startPoint,
        bendPoints: section.bendPoints,
        endPoint: section.endPoint,
        // set default isAnimated to true
        isAnimated: true,
        label: elkEdge?.labels?.length ? elkEdge.labels[0] : undefined,
      })
      return acc
    }, [])

    const memoLayout = {
      nodes: newNodes,
      edges: newEdges,
      height: elkOutput.height || 0,
      width: elkOutput.width || 0,
    }

    layoutRef.current = memoLayout

    return memoLayout
  }, [isRendering, elkOutput, keepPreviousLayout, edges, nodes])

  return { layout, error: isRendering ? undefined : error, isRendering }
}
