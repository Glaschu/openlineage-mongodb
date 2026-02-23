// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { generateNodeId } from '../../helpers/nodes'
import * as requestUtils from '../../store/requests'
import { getLineage } from '../../store/requests/lineage'

describe('getLineage function', () => {
  let spy: ReturnType<typeof vi.spyOn>
  let testResult: Promise<any>

  beforeEach(() => {
    spy = vi.spyOn(requestUtils, 'genericFetchWrapper').mockImplementation(() => {})
    testResult = getLineage('JOB', 'foo', 'bar', 0)
  })

  it('does not url-encode query params', () => {
    const expectedNodeId = generateNodeId('JOB', 'foo', 'bar')
    const actualParamString = (spy.mock.lastCall?.[0] as string).split('?')
    expect(actualParamString.pop()!.split('&')).toContain(`nodeId=${expectedNodeId}`)
  })
})