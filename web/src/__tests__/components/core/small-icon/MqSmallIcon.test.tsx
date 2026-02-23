// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { faCog, faDatabase, faServer } from '@fortawesome/free-solid-svg-icons'
import { render } from '@testing-library/react'
import MqSmallIcon from '../../../../components/core/small-icon/MqSmallIcon'

describe('MqSmallIcon Component', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <MqSmallIcon
        icon={faDatabase}
        backgroundColor='#000000'
        foregroundColor='#ffffff'
        shape='circle'
      />
    )
    expect(container).toBeInTheDocument()
  })

  it('should render with circle shape', () => {
    const { container } = render(
      <MqSmallIcon
        icon={faDatabase}
        backgroundColor='#000000'
        foregroundColor='#ffffff'
        shape='circle'
      />
    )
    const iconBox = container.firstChild as HTMLElement
    expect(iconBox).toBeInTheDocument()
  })

  it('should render with rect shape', () => {
    const { container } = render(
      <MqSmallIcon
        icon={faDatabase}
        backgroundColor='#000000'
        foregroundColor='#ffffff'
        shape='rect'
      />
    )
    const iconBox = container.firstChild as HTMLElement
    expect(iconBox).toBeInTheDocument()
  })

  it('should render with custom background color', () => {
    const backgroundColor = '#ff0000'
    const { container } = render(
      <MqSmallIcon
        icon={faDatabase}
        backgroundColor={backgroundColor}
        foregroundColor='#ffffff'
        shape='circle'
      />
    )
    expect(container).toBeInTheDocument()
  })

  it('should render with custom foreground color', () => {
    const foregroundColor = '#00ff00'
    const { container } = render(
      <MqSmallIcon
        icon={faDatabase}
        backgroundColor='#000000'
        foregroundColor={foregroundColor}
        shape='circle'
      />
    )
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('should render different icons', () => {
    const { container: container1 } = render(
      <MqSmallIcon
        icon={faDatabase}
        backgroundColor='#000000'
        foregroundColor='#ffffff'
        shape='circle'
      />
    )
    const { container: container2 } = render(
      <MqSmallIcon
        icon={faServer}
        backgroundColor='#000000'
        foregroundColor='#ffffff'
        shape='circle'
      />
    )
    expect(container1.querySelector('svg')).toBeInTheDocument()
    expect(container2.querySelector('svg')).toBeInTheDocument()
  })

  it('should render with specific dimensions', () => {
    const { container } = render(
      <MqSmallIcon
        icon={faDatabase}
        backgroundColor='#000000'
        foregroundColor='#ffffff'
        shape='circle'
      />
    )
    const iconBox = container.firstChild
    expect(iconBox).toBeInTheDocument()
  })

  it('should render FontAwesome icon', () => {
    const { container } = render(
      <MqSmallIcon icon={faCog} backgroundColor='#333333' foregroundColor='#eeeeee' shape='rect' />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should render with dark background and light foreground', () => {
    const { container } = render(
      <MqSmallIcon
        icon={faDatabase}
        backgroundColor='#1a1a1a'
        foregroundColor='#f0f0f0'
        shape='circle'
      />
    )
    expect(container).toBeInTheDocument()
  })

  it('should render with light background and dark foreground', () => {
    const { container } = render(
      <MqSmallIcon
        icon={faDatabase}
        backgroundColor='#f0f0f0'
        foregroundColor='#1a1a1a'
        shape='rect'
      />
    )
    expect(container).toBeInTheDocument()
  })

  it('should render multiple icons with different shapes', () => {
    const { container: circleContainer } = render(
      <MqSmallIcon
        icon={faDatabase}
        backgroundColor='#000000'
        foregroundColor='#ffffff'
        shape='circle'
      />
    )
    const { container: rectContainer } = render(
      <MqSmallIcon
        icon={faServer}
        backgroundColor='#000000'
        foregroundColor='#ffffff'
        shape='rect'
      />
    )
    expect(circleContainer).toBeInTheDocument()
    expect(rectContainer).toBeInTheDocument()
  })
})
