/**
 * What one trial tenant is allowed to create.
 *
 * Not a cap on what the sandbox *holds* — it holds 1,821 users, 775 pending
 * devices and 794 log rows the moment it is created, and that seeded scale is
 * the thing worth showing. It is a cap on what a visitor *adds*, which is the
 * only part that costs anything per tenant and the only part anyone would
 * abuse.
 *
 * The distinction matters for the hosted build. A seeded row is identical in
 * every tenant, so it can be generated rather than stored; a created row is
 * that visitor's own and has to be kept. Counting creations is therefore also
 * counting the real storage a tenant is responsible for.
 *
 * These are advisory on the client. The browser can be told to ignore them,
 * so the same numbers have to be enforced in `netlify/functions/api.mjs`
 * before the hosted build is open to the public — see TENANCY.md.
 */

import { tenant, save } from './trial.js'

/** The default plan. One set of numbers, in one place. */
export const PLAN = {
  users: 25,
  applications: 20,
  gateways: 5,
  accessRules: 30,
  userGroups: 10,
  devices: 10
}

/** Friendly names for the message, where the key is not one. */
const NOUN = {
  users: 'users',
  applications: 'applications',
  gateways: 'gateways',
  accessRules: 'access rules',
  userGroups: 'user groups',
  devices: 'devices'
}

/** How many of `kind` this visitor has created so far. */
export function used (kind) {
  return tenant.value.created?.[kind] || 0
}

/** The cap for `kind`, or Infinity when it is not capped. */
export function cap (kind) {
  const plan = tenant.value.plan || PLAN
  return plan[kind] ?? Infinity
}

export function remaining (kind) {
  return Math.max(0, cap(kind) - used(kind))
}

/**
 * Whether one more may be created.
 *
 * Returns '' to allow, or the sentence to show. The sentence says the number
 * rather than "limit reached", because a visitor who has hit 20 applications
 * wants to know it was 20 and not that something went wrong.
 */
export function check (kind) {
  const c = cap(kind)
  if (!Number.isFinite(c)) return ''
  const n = used(kind)
  if (n < c) return ''
  return `This trial allows ${c} ${NOUN[kind] || kind} of your own, and you have created ${n}. ` +
    'Reset the sandbox to start again, or talk to us about a tenant without the limit.'
}

/**
 * Record a creation.
 *
 * Called after the write succeeds, never before — a refused create must not
 * spend an allowance, which is the bug the obvious ordering produces.
 */
export function recordCreate (kind) {
  if (!kind) return
  const created = { ...(tenant.value.created || {}) }
  created[kind] = (created[kind] || 0) + 1
  /* Through `save`'s patch rather than by mutating the ref, so the write to
     localStorage and the reactive update are the same operation. */
  save({ created })
}

/** Put every allowance back, for the sandbox reset. */
export function resetCreated () {
  save({ created: {} })
}
