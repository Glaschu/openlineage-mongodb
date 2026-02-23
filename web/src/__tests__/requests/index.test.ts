// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as requestUtils from '../../store/requests'
import { parseResponse } from '../../store/requests'

export const mockFetch = (requestBody: any = []) => {
  return vi.fn().mockImplementation(() => Promise.resolve({
    json: () => Promise.resolve(requestBody),
    text: () => Promise.resolve(JSON.stringify(requestBody)),
    ok: true
  }))
}

const generateMockResponse = (status = 200, ok: boolean, returnBody?: object) => ({
  ok,
  status,
  json: () => Promise.resolve(returnBody || {}),
  text: () => Promise.resolve(returnBody ? JSON.stringify(returnBody) : '')
})

describe('parseResponse function', () => {
  describe('for a successful response', () => {
    it('returns Success if body does not exist', async () => {
      const testResponse = generateMockResponse(201, true, null)
      await expect(parseResponse(testResponse, 'testFunctionName')).resolves.toEqual('Success')
    })

    it('returns parsed body if body does exist', async () => {
      const testBody = { hasBody: true }
      const testResponse = generateMockResponse(200, true, testBody)
      await expect(parseResponse(testResponse, 'testFunctionName')).resolves.toEqual(testBody)
    })
  })

  describe('for a unsuccessful response', () => {

    it('throws an error', async () => {
      const errorBody = { code: 500, message: 'Server Error', details: 'Something went wrong' }
      const testResponse = generateMockResponse(500, false, errorBody)
      await expect(parseResponse(testResponse, 'testFunctionName')).rejects.toThrow()
    })
  })
})
