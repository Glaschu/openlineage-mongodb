// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import MqPaging from '../../../components/paging/MqPaging'

describe('MqPaging Component', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <MqPaging
        pageSize={10}
        currentPage={0}
        totalCount={100}
        incrementPage={() => {}}
        decrementPage={() => {}}
      />
    )
    expect(container).toBeInTheDocument()
  })
})
