// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    getAlationMappings,
    suggestAlationMappings,
    acceptAlationMapping,
    rejectAlationMapping,
} from '../../store/requests/alation'

// Mock the global fetch
global.fetch = vi.fn()

describe('Alation Requests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getAlationMappings', () => {
        it('fetches all mappings successfully', async () => {
            const mockMappings = [
                {
                    id: 'ns:dataset1',
                    openLineageNamespace: 'ns',
                    openLineageDatasetName: 'dataset1',
                    alationDatasetId: 100,
                    alationDatasetName: 'al_dataset1',
                    confidenceScore: 0.85,
                    status: 'SUGGESTED',
                    updatedAt: '2026-01-01T00:00:00Z',
                },
            ]

                ; (global.fetch as any).mockResolvedValue({
                    ok: true,
                    text: async () => JSON.stringify(mockMappings),
                })

            const result = await getAlationMappings()

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/alation-mappings'),
                expect.objectContaining({ method: 'GET' })
            )
            expect(result).toEqual(mockMappings)
        })

        it('includes namespace query param when provided', async () => {
            ; (global.fetch as any).mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify([]),
            })

            await getAlationMappings('my-namespace')

            const call = (global.fetch as any).mock.calls[0][0]
            expect(call).toContain('namespace=my-namespace')
        })

        it('includes status query param when provided', async () => {
            ; (global.fetch as any).mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify([]),
            })

            await getAlationMappings(undefined, 'ACCEPTED')

            const call = (global.fetch as any).mock.calls[0][0]
            expect(call).toContain('status=ACCEPTED')
        })

        it('includes both namespace and status params', async () => {
            ; (global.fetch as any).mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify([]),
            })

            await getAlationMappings('my-namespace', 'SUGGESTED')

            const call = (global.fetch as any).mock.calls[0][0]
            expect(call).toContain('namespace=my-namespace')
            expect(call).toContain('status=SUGGESTED')
        })

        it('does not include query params when not provided', async () => {
            ; (global.fetch as any).mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify([]),
            })

            await getAlationMappings()

            const call = (global.fetch as any).mock.calls[0][0]
            expect(call).not.toContain('?')
        })

        it('handles fetch errors', async () => {
            ; (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 500,
                text: async () =>
                    JSON.stringify({ code: 500, message: 'Server error', details: '' }),
            })

            await expect(getAlationMappings()).rejects.toThrow()
        })

        it('handles network errors', async () => {
            ; (global.fetch as any).mockRejectedValue(new Error('Network error'))

            await expect(getAlationMappings()).rejects.toThrow('Network error')
        })
    })

    describe('suggestAlationMappings', () => {
        it('triggers suggest successfully', async () => {
            ; (global.fetch as any).mockResolvedValue({
                ok: true,
                text: async () => JSON.stringify('Success'),
            })

            await suggestAlationMappings('my-namespace', 42)

            const call = (global.fetch as any).mock.calls[0][0]
            expect(call).toContain('/alation-mappings/suggest')
            expect(call).toContain('namespace=my-namespace')
            expect(call).toContain('schemaId=42')

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ method: 'POST' })
            )
        })

        it('handles suggest errors', async () => {
            ; (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 500,
                text: async () =>
                    JSON.stringify({ code: 500, message: 'Server error', details: '' }),
            })

            await expect(suggestAlationMappings('ns', 1)).rejects.toThrow()
        })
    })

    describe('acceptAlationMapping', () => {
        it('accepts a mapping successfully', async () => {
            const mockResult = {
                id: 'ns:dataset1',
                status: 'ACCEPTED',
            }

                ; (global.fetch as any).mockResolvedValue({
                    ok: true,
                    text: async () => JSON.stringify(mockResult),
                })

            const result = await acceptAlationMapping('ns:dataset1')

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/alation-mappings/ns%3Adataset1/accept'),
                expect.objectContaining({ method: 'PUT' })
            )
            expect(result).toEqual(mockResult)
        })

        it('handles accept errors', async () => {
            ; (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 404,
                text: async () =>
                    JSON.stringify({ code: 404, message: 'Not found', details: '' }),
            })

            await expect(acceptAlationMapping('nonexistent')).rejects.toThrow()
        })
    })

    describe('rejectAlationMapping', () => {
        it('rejects a mapping successfully', async () => {
            const mockResult = {
                id: 'ns:dataset1',
                status: 'REJECTED',
            }

                ; (global.fetch as any).mockResolvedValue({
                    ok: true,
                    text: async () => JSON.stringify(mockResult),
                })

            const result = await rejectAlationMapping('ns:dataset1')

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/alation-mappings/ns%3Adataset1/reject'),
                expect.objectContaining({ method: 'PUT' })
            )
            expect(result).toEqual(mockResult)
        })

        it('handles reject errors', async () => {
            ; (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 404,
                text: async () =>
                    JSON.stringify({ code: 404, message: 'Not found', details: '' }),
            })

            await expect(rejectAlationMapping('nonexistent')).rejects.toThrow()
        })
    })
})
