import { Box } from '@mui/system'
import { RootState } from '@/store/store'
import { LineageDataset, LineageJob } from '@/shared/types/lineage'
import { LineageGraph } from '@/shared/types/api'
import { useSearchParams } from 'react-router-dom'
import DatasetDetailPage from '@/features/datasets/components/DatasetDetailPage'
import JobDetailPage from '@/features/jobs/components/JobDetailPage'

const WIDTH = 800

interface TableLevelDrawerProps {
  lineageGraph: LineageGraph
}

const TableLevelDrawer = ({ lineageGraph }: TableLevelDrawerProps) => {
  const [searchParams] = useSearchParams()

  const node = lineageGraph.graph.find(
    (node) => node.id === searchParams.get('tableLevelNode') || ''
  )

  let dataset = null
  let job = null
  if (node?.type === 'DATASET') {
    dataset = node.data as LineageDataset
  } else if (node?.type === 'JOB') {
    job = node.data as LineageJob
  }

  return (
    <Box width={`${WIDTH}px`}>
      {dataset ? (
        <DatasetDetailPage lineageDataset={dataset} />
      ) : (
        <>{job && <JobDetailPage lineageJob={job} />}</>
      )}
    </Box>
  )
}

export default TableLevelDrawer
