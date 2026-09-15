// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/**
 * Saves a blob to the user's downloads. Replaces file-saver, whose remaining
 * value over this was support for browsers the rest of the app already
 * requires features from.
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  // Revoking synchronously can cancel the download in some browsers; let the
  // click settle first.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
