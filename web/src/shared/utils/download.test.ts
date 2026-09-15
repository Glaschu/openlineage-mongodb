import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { downloadBlob } from '@/shared/utils/download'

describe('downloadBlob', () => {
  const createObjectURL = vi.fn(() => 'blob:fake-url')
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('clicks a download link for the blob and cleans up after itself', () => {
    const clicks: HTMLAnchorElement[] = []
    const realClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
      clicks.push(this)
    }

    try {
      downloadBlob(new Blob(['a,b\n1,2'], { type: 'text/csv' }), 'export.csv')

      expect(clicks).toHaveLength(1)
      expect(clicks[0].getAttribute('href')).toBe('blob:fake-url')
      expect(clicks[0].getAttribute('download')).toBe('export.csv')
      // The anchor must not be left behind in the document.
      expect(document.querySelector('a[download]')).toBeNull()
    } finally {
      HTMLAnchorElement.prototype.click = realClick
    }

    // Revoking synchronously can cancel the download, so it waits a tick.
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url')
  })
})
