// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Namespace } from '@/shared/types/api'

/**
 * The API records ownership on the namespace, and uses the literal string
 * "Unclaimed" for namespaces nobody has taken. That is not a missing value: an
 * unowned namespace in a change's blast radius is a finding, so it is carried
 * through to the lists and evidence packs rather than blanked out.
 */
export const UNCLAIMED_OWNER = 'Unclaimed'

export const buildOwnerIndex = (namespaces: Namespace[] | undefined): Map<string, string> =>
  new Map((namespaces ?? []).map((namespace) => [namespace.name, namespace.ownerName ?? '']))

export const ownerFor = (owners: Map<string, string>, namespace: string) =>
  owners.get(namespace) ?? ''

export const isUnclaimed = (owner: string) => owner === UNCLAIMED_OWNER || owner === ''

/** Tallies owners, unclaimed last so a reader sees real teams first. */
export const summariseOwners = (owners: string[]): [string, number][] => {
  const counts = new Map<string, number>()
  for (const owner of owners) {
    const key = owner || UNCLAIMED_OWNER
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()].sort((a, b) => {
    const aUnclaimed = isUnclaimed(a[0])
    const bUnclaimed = isUnclaimed(b[0])
    if (aUnclaimed !== bUnclaimed) return aUnclaimed ? 1 : -1
    return b[1] - a[1] || a[0].localeCompare(b[0])
  })
}
