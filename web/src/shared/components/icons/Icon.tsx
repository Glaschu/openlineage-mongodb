// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React, { useId } from 'react'

import type { IconDefinition } from './icons'

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'title'> {
  icon: IconDefinition
  /** Accessible name. When omitted the icon is hidden from assistive tech. */
  title?: string
}

/**
 * Drop-in replacement for FontAwesomeIcon.
 *
 * Renders the same element and attributes FontAwesomeIcon produced, so callers
 * can keep passing SVG attributes (width/height/x/y for icons nested inside the
 * lineage graph's SVG, color, style) and get identical output.
 *
 * fontawesome-svg-core injected its stylesheet into <head> at runtime, so the
 * sizing it applied is not optional — `.mq-icon` in styles/index.css carries
 * the same rules.
 */
export const Icon = ({ icon, title, className, ...svgProps }: IconProps) => {
  const titleId = useId()

  return (
    <svg
      data-icon={icon.iconName}
      className={className ? `mq-icon ${className}` : 'mq-icon'}
      role='img'
      focusable='false'
      xmlns='http://www.w3.org/2000/svg'
      viewBox={`0 0 ${icon.width} ${icon.height}`}
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
      {...svgProps}
    >
      {title && <title id={titleId}>{title}</title>}
      <path fill='currentColor' d={icon.path} />
    </svg>
  )
}

export default Icon
