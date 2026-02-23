// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import dayjs from './dayjs'

function addLeadingZero(number: number) {
  if (number.toString().length === 1) {
    return `0${number.toString()}`
  }
  return number
}

export function stopWatchDuration(durationMs: number) {
  const duration = dayjs.duration(durationMs, 'milliseconds')
  if (duration.asMilliseconds() === 0) {
    return '0'
  }
  if (duration.asHours() > 24) {
    return `${duration.days()}d ${duration.hours()}h ${duration.minutes()}m ${duration.seconds()}s`
  }
  if (duration.asMinutes() > 60) {
    return `${duration.hours()}h ${duration.minutes()}m ${duration.seconds()}s`
  }
  if (duration.asSeconds() > 1) {
    return `${duration.minutes()}m ${addLeadingZero(duration.seconds())}s`
  } else {
    return `${Math.round(duration.asMilliseconds() * 100) / 100} ms`
  }
}

export function formatDatePicker(val: string | number | Date) {
  return dayjs(val).format('YYYY-MM-DDTHH:mm:ss')
}

export function formatDateAPIQuery(val: string | number | Date) {
  return dayjs(val).format('YYYY-MM-DDTHH:mm:ss[.000Z]')
}
