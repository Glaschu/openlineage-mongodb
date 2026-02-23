import { JobOrDataset, LineageDataset, LineageJob } from '../../types/lineage'
import { NodeRendererMap } from '../../components/graph'
import TableLineageDatasetNode from './TableLineageDatasetNode'
import TableLineageJobNode from './TableLineageJobNode'
import TableLineageGroupNode, { TableLineageGroupNodeData } from './TableLineageGroupNode'

export interface TableLineageJobNodeData {
  job: LineageJob
}

export interface TableLineageDatasetNodeData {
  dataset: LineageDataset
}

export type TableLevelNodeData = TableLineageDatasetNodeData | TableLineageJobNodeData | TableLineageGroupNodeData

export const tableLevelNodeRenderer: NodeRendererMap<JobOrDataset | 'GROUP', TableLevelNodeData> = new Map()
  .set('JOB', TableLineageJobNode)
  .set('DATASET', TableLineageDatasetNode)
  .set('GROUP', TableLineageGroupNode)
