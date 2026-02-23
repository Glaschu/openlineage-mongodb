import { Box } from '@mui/system'
import { RootState } from '../../store/store'
import { Job } from '../../types/api'
import { theme } from '../../helpers/theme'
import { useJobs } from '../../queries/jobs'
import CircularProgress from '@mui/material/CircularProgress/CircularProgress'
import JobRunItem from './JobRunItem'
import MqPaging from '../../components/paging/MqPaging'
import MqText from '../../components/core/text/MqText'
import React, { useEffect } from 'react'
const WIDTH = 800
const PAGE_SIZE = 10

const JobsDrawer = () => {
  const [page, setPage] = React.useState<number>(0)
  const { data: jobsResult, isLoading: isJobsLoading } = useJobs(null, PAGE_SIZE, page * PAGE_SIZE)
  const jobs = jobsResult?.jobs || []
  const jobCount = jobsResult?.totalCount || 0
  const handleClickPage = (direction: 'prev' | 'next') => {
    const directionPage = direction === 'next' ? page + 1 : page - 1
    setPage(directionPage)
  }

  return (
    <Box width={`${WIDTH}px`}>
      <Box px={2}>
        <Box
          position={'sticky'}
          top={0}
          bgcolor={theme.palette.background.default}
          pt={2}
          zIndex={theme.zIndex.appBar}
          sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}
          mb={2}
        >
          <Box display={'flex'} alignItems={'center'} justifyContent={'space-between'} pb={2}>
            <MqText font={'mono'} heading>
              Jobs
            </MqText>
            <MqPaging
              pageSize={PAGE_SIZE}
              currentPage={page}
              totalCount={jobCount}
              incrementPage={() => handleClickPage('next')}
              decrementPage={() => handleClickPage('prev')}
            />
          </Box>
        </Box>
        <Box>
          {jobs.map((job) => (
            <JobRunItem key={job.id.namespace + job.id.name} job={job} />
          ))}
          {isJobsLoading && (
            <Box display={'flex'} justifyContent={'center'}>
              <CircularProgress />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default JobsDrawer
