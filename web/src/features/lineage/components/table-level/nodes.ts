import { JobOrDataset, LineageDataset, LineageJob } from '@/shared/types/lineage'
import { NodeRendererMap } from '@/features/lineage/components/graph'
import TableLineageDatasetNode from './TableLineageDatasetNode'
import TableLineageGroupNode, { TableLineageGroupNodeData } from './TableLineageGroupNode'
import TableLineageJobNode from './TableLineageJobNode'

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

export const tableLevelNodeRenderer: NodeRendererMap<JobOrDataset | 'GROUP', TableLevelNodeData> =
  new Map()
    .set('JOB', TableLineageJobNode)
    .set('DATASET', TableLineageDatasetNode)
    .set('GROUP', TableLineageGroupNode)
