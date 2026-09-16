import { JobOrDataset, LineageDataset, LineageJob } from '@/shared/types/lineage'
import { NodeRendererMap } from '@/features/lineage/components/graph'
import TableLineageDatasetNode from './TableLineageDatasetNode'
import TableLineageGroupNode, { TableLineageGroupNodeData } from './TableLineageGroupNode'
import TableLineageJobNode from './TableLineageJobNode'
import TableLineageNamespaceNode, {
  TableLineageNamespaceNodeData,
} from './TableLineageNamespaceNode'

export interface TableLineageJobNodeData {
  job: LineageJob
}

export interface TableLineageDatasetNodeData {
  dataset: LineageDataset
}

export type TableLevelNodeData =
  | TableLineageDatasetNodeData
  | TableLineageJobNodeData
  | TableLineageGroupNodeData
  | TableLineageNamespaceNodeData

export const tableLevelNodeRenderer: NodeRendererMap<
  JobOrDataset | 'GROUP' | 'NAMESPACE',
  TableLevelNodeData
> = new Map()
  .set('JOB', TableLineageJobNode)
  .set('DATASET', TableLineageDatasetNode)
  .set('GROUP', TableLineageGroupNode)
  .set('NAMESPACE', TableLineageNamespaceNode)
