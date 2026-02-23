// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addJobTag,
  deleteJob,
  deleteJobTag,
  getJob,
  getJobs,
  getJobsByState,
  getRuns,
} from '../../store/requests/jobs'

// Mock the global fetch
global.fetch = vi.fn()

describe('Jobs Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getJobs', () => {
    it('fetches jobs with namespace', async () => {
      const mockResponse = {
        jobs: [{ name: 'job1' }, { name: 'job2' }],
        totalCount: 2,
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      const result = await getJobs('test-namespace')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/namespaces/test-namespace/jobs'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result.jobs).toHaveLength(2)
      expect(result.totalCount).toBe(2)
    })

    it('fetches all jobs when namespace is null', async () => {
      const mockResponse = { jobs: [], totalCount: 0 }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      await getJobs(null)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/jobs?limit=25&offset=0'),
        expect.any(Object)
      )
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/namespaces/'),
        expect.any(Object)
      )
    })

    it('fetches jobs with custom limit and offset', async () => {
      const mockResponse = { jobs: [], totalCount: 0 }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      await getJobs('ns', 50, 100)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50&offset=100'),
        expect.any(Object)
      )
    })

    it('fetches jobs with lastRunStates filter', async () => {
      const mockResponse = { jobs: [], totalCount: 0 }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      await getJobs('ns', 25, 0, 'FAILED')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('lastRunStates=FAILED'),
        expect.any(Object)
      )
    })

    it('fetches jobs without lastRunStates when not provided', async () => {
      const mockResponse = { jobs: [], totalCount: 0 }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      await getJobs('ns', 25, 0)

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).not.toContain('lastRunStates')
    })

    it('encodes namespace with special characters', async () => {
      const mockResponse = { jobs: [], totalCount: 0 }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      await getJobs('namespace/with/slashes')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('namespace%2Fwith%2Fslashes'),
        expect.any(Object)
      )
    })

    it('handles fetch errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ code: 404, message: 'Not found', details: '' }),
      })

      await expect(getJobs('ns')).rejects.toThrow()
    })
  })

  describe('deleteJob', () => {
    it('deletes a job successfully', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await deleteJob('test-namespace', 'test-job')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/namespaces/test-namespace/jobs/test-job'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('encodes job name with special characters', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await deleteJob('ns', 'job/with/slashes')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('job%2Fwith%2Fslashes'),
        expect.any(Object)
      )
    })

    it('encodes namespace with special characters', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await deleteJob('ns with spaces', 'job')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ns%20with%20spaces'),
        expect.any(Object)
      )
    })
  })

  describe('getRuns', () => {
    it('fetches job runs successfully', async () => {
      const mockRuns = [{ id: 'run1' }, { id: 'run2' }]

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockRuns),
      })

      const result = await getRuns('test-job', 'test-namespace', 10, 0)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/namespaces/test-namespace/jobs/test-job/runs'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockRuns)
    })

    it('includes pagination parameters', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getRuns('job', 'ns', 20, 5)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=20&offset=5'),
        expect.any(Object)
      )
    })

    it('encodes both job name and namespace', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      await getRuns('job/name', 'ns/name', 10, 0)

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('job%2Fname')
      expect(call).toContain('ns%2Fname')
    })
  })

  describe('getJob', () => {
    it('fetches a single job', async () => {
      const mockJob = {
        name: 'test-job',
        namespace: 'test-namespace',
        type: 'BATCH',
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockJob),
      })

      const result = await getJob('test-namespace', 'test-job')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/namespaces/test-namespace/jobs/test-job'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result.name).toBe('test-job')
    })

    it('encodes job and namespace with special characters', async () => {
      const mockJob = { name: 'job' }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockJob),
      })

      await getJob('ns:prod', 'job:etl')

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('ns%3Aprod')
      expect(call).toContain('job%3Aetl')
    })
  })

  describe('deleteJobTag', () => {
    it('deletes a job tag successfully', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await deleteJobTag('test-namespace', 'test-job', 'test-tag')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/namespaces/test-namespace/jobs/test-job/tags/test-tag'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('encodes all three parameters', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await deleteJobTag('ns/1', 'job/1', 'tag/1')

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('ns%2F1')
      expect(call).toContain('job%2F1')
      expect(call).toContain('tag%2F1')
    })

    it('handles tag with colon character', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await deleteJobTag('ns', 'job', 'pii:sensitive')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('pii%3Asensitive'),
        expect.any(Object)
      )
    })
  })

  describe('addJobTag', () => {
    it('adds a job tag successfully', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await addJobTag('test-namespace', 'test-job', 'test-tag')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/namespaces/test-namespace/jobs/test-job/tags/test-tag'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('encodes tag name with spaces', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await addJobTag('ns', 'job', 'production environment')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('production%20environment'),
        expect.any(Object)
      )
    })

    it('encodes all parameters correctly', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Success',
      })

      await addJobTag('my ns', 'my job', 'my tag')

      const call = (global.fetch as any).mock.calls[0][0]
      expect(call).toContain('my%20ns')
      expect(call).toContain('my%20job')
      expect(call).toContain('my%20tag')
    })
  })

  describe('getJobsByState', () => {
    it('fetches jobs by run state', async () => {
      const mockResponse = { jobs: [{ name: 'job1' }], totalCount: 1 }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      await getJobsByState('FAILED', 10, 0)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/jobs?runState=FAILED'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('includes pagination parameters', async () => {
      const mockResponse = { jobs: [], totalCount: 0 }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      await getJobsByState('COMPLETED', 25, 50)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=25&offset=50'),
        expect.any(Object)
      )
    })

    it('works with different run states', async () => {
      const mockResponse = { jobs: [], totalCount: 0 }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      await getJobsByState('RUNNING', 10, 0)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('runState=RUNNING'),
        expect.any(Object)
      )
    })
  })
})
