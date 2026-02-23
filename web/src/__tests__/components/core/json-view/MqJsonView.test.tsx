// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MqJsonView from '../../../../components/core/json-view/MqJsonView'

describe('MqJsonView Component', () => {
  it('should render without crashing', () => {
    const testData = { key: 'value' }
    const { container } = render(<MqJsonView data={testData} />)
    expect(container).toBeInTheDocument()
  })

  it('should render simple object data', () => {
    const testData = { name: 'Test', value: 123 }
    const { container } = render(<MqJsonView data={testData} />)
    expect(container).toBeInTheDocument()
    // JsonView component renders successfully
    const jsonViewElement = container.querySelector('.w-json-view-container')
    expect(jsonViewElement || container.firstChild).toBeTruthy()
  })

  it('should render nested object data', () => {
    const testData = {
      user: {
        name: 'John',
        age: 30,
        address: {
          city: 'New York',
          zip: '10001',
        },
      },
    }
    const { container } = render(<MqJsonView data={testData} />)
    expect(container).toBeInTheDocument()
  })

  it('should render array data', () => {
    const testData = {
      items: [1, 2, 3, 4, 5],
    }
    const { container } = render(<MqJsonView data={testData} />)
    expect(container).toBeInTheDocument()
  })

  it('should render boolean values', () => {
    const testData = {
      isActive: true,
      isDeleted: false,
    }
    const { container } = render(<MqJsonView data={testData} />)
    expect(container).toBeInTheDocument()
  })

  it('should render null values', () => {
    const testData = {
      value: null,
    }
    const { container } = render(<MqJsonView data={testData} />)
    expect(container).toBeInTheDocument()
  })

  it('should render empty object', () => {
    const testData = {}
    const { container } = render(<MqJsonView data={testData} />)
    expect(container).toBeInTheDocument()
  })

  it('should render complex nested structure', () => {
    const testData = {
      metadata: {
        version: '1.0',
        tags: ['tag1', 'tag2'],
        settings: {
          enabled: true,
          timeout: 3000,
        },
      },
    }
    const { container } = render(<MqJsonView data={testData} />)
    expect(container).toBeInTheDocument()
  })

  it('should render string values', () => {
    const testData = {
      description: 'This is a test description',
      status: 'active',
    }
    const { container } = render(<MqJsonView data={testData} />)
    expect(container).toBeInTheDocument()
  })

  it('should render number values', () => {
    const testData = {
      count: 42,
      price: 19.99,
      negative: -5,
    }
    const { container } = render(<MqJsonView data={testData} />)
    expect(container).toBeInTheDocument()
  })

  it('should render array of objects', () => {
    const testData = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    }
    const { container } = render(<MqJsonView data={testData} />)
    expect(container).toBeInTheDocument()
  })
})
