/**
 * Field formats, checked properly.
 *
 * The console asked only whether a required field was empty, and said so in a
 * toast. So a Base DN of "users" was accepted, an LDAP filter missing a
 * bracket was accepted, and "10.0.0.300/33" was accepted — and a visitor
 * evaluating a Zero Trust product typed a real DN from their own directory,
 * got no complaint, and learned nothing about whether this console
 * understands directories. A demo that accepts anything proves nothing.
 *
 * Everything here returns `''` when the value is good and a sentence when it
 * is not. The sentence is what the field shows, so it has to say what is
 * wrong and ideally where — "Unbalanced brackets: 2 opened, 1 closed" beats
 * "Invalid filter".
 *
 * Empty is always valid here. Presence is a separate question, asked by
 * `required` on the field, and a field that is both empty and optional must
 * not shout.
 */

/* ------------------------------------------------------------------ hosts */

const OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)'
const IPV4_RE = new RegExp(`^${OCTET}\\.${OCTET}\\.${OCTET}\\.${OCTET}$`)

export function ipv4 (v) {
  if (!v) return ''
  const s = String(v).trim()
  if (IPV4_RE.test(s)) return ''
  /* The common near-misses are worth naming rather than lumping together:
     somebody who typed three octets made a different mistake from somebody
     whose octet is 300. */
  const parts = s.split('.')
  if (parts.length !== 4) return `An IPv4 address has four parts; this has ${parts.length}.`
  const bad = parts.find(p => !/^\d+$/.test(p) || Number(p) > 255)
  if (bad !== undefined) {
    return /^\d+$/.test(bad)
      ? `Each part must be 0–255; "${bad}" is not.`
      : `"${bad}" is not a number.`
  }
  return 'Not a valid IPv4 address.'
}

export function cidr (v) {
  if (!v) return ''
  const s = String(v).trim()
  if (!s.includes('/')) return 'A network needs a prefix length, such as /24.'
  const [addr, len, ...rest] = s.split('/')
  if (rest.length) return 'Only one "/" is allowed.'
  const bad = ipv4(addr)
  if (bad) return bad
  if (!/^\d+$/.test(len)) return 'The prefix length must be a number, such as /24.'
  const n = Number(len)
  if (n > 32) return 'The prefix length cannot be more than 32.'
  /* Host bits set outside the mask is the mistake that silently matches
     nothing, so it is worth catching even though the string parses. */
  const octets = addr.trim().split('.').map(Number)
  const asInt = ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3]
  const mask = n === 0 ? 0 : (0xffffffff << (32 - n)) >>> 0
  if ((asInt & mask) >>> 0 !== asInt) {
    const net = [24, 16, 8, 0].map(sh => ((asInt & mask) >>> sh) & 255).join('.')
    return `Host bits are set. Did you mean ${net}/${n}?`
  }
  return ''
}

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i

export function fqdn (v) {
  if (!v) return ''
  const s = String(v).trim().replace(/\.$/, '')
  if (s.length > 253) return 'A domain name cannot be longer than 253 characters.'
  const labels = s.split('.')
  if (labels.length < 2) return 'A domain name needs at least two parts, such as corp.example.com.'
  for (const l of labels) {
    if (!l) return 'A domain name cannot contain an empty part ("..").'
    if (l.length > 63) return `"${l}" is longer than the 63-character limit for one part.`
    if (!LABEL.test(l)) {
      return l.startsWith('-') || l.endsWith('-')
        ? `"${l}" cannot start or end with a hyphen.`
        : `"${l}" may only contain letters, digits and hyphens.`
    }
  }
  if (!/^[a-z]{2,}$/i.test(labels[labels.length - 1])) {
    return 'The last part must be letters only, such as .com.'
  }
  return ''
}

/** An address or a name — which is what most server fields actually accept. */
export function host (v) {
  if (!v) return ''
  const s = String(v).trim()
  if (/^\d+(\.\d+)*$/.test(s)) return ipv4(s)
  return fqdn(s)
}

export function port (v) {
  if (v === '' || v === null || v === undefined) return ''
  const s = String(v).trim()
  if (!/^\d+$/.test(s)) return 'A port is a number between 1 and 65535.'
  const n = Number(s)
  if (n < 1 || n > 65535) return 'A port must be between 1 and 65535.'
  return ''
}

export function portRange (v) {
  if (!v) return ''
  const s = String(v).trim()
  if (!s.includes('-')) return port(s)
  const [a, b, ...rest] = s.split('-')
  if (rest.length) return 'A range is two ports, such as 8000-8080.'
  return port(a) || port(b) ||
    (Number(a) >= Number(b) ? 'The first port must be lower than the second.' : '')
}

/**
 * A comma-separated list of ports and ranges, as the application form takes
 * it: "80,443,1000-2000". Each item is reported by name, because a list of
 * eight with one wrong is not usefully described as "invalid".
 */
export function portList (v) {
  if (!v) return ''
  const items = String(v).split(',').map(x => x.trim())
  if (items.some(x => !x)) return 'There is an empty entry — check for a stray comma.'
  for (const item of items) {
    const err = portRange(item)
    if (err) return items.length > 1 ? `"${item}": ${err.charAt(0).toLowerCase()}${err.slice(1)}` : err
  }
  return ''
}

/* ------------------------------------------------------------ directories */

/* RFC 4514 attribute type: a descriptor, or a dotted OID. */
const ATTR = /^([A-Za-z][A-Za-z0-9-]*|\d+(\.\d+)+)$/

/**
 * A distinguished name.
 *
 * Velto's own placeholders use both spaced and unspaced forms
 * ("CN=Users, DC=corp, DC=example" and "dc=example,dc=com"), so spaces around
 * the separators are accepted. An escaped comma (`\,`) inside a value is not
 * a separator, which is the detail a split(',') gets wrong.
 */
export function dn (v) {
  if (!v) return ''
  const s = String(v).trim()
  if (!s.includes('=')) {
    return 'A DN is made of attribute=value pairs, such as dc=example,dc=com.'
  }

  /* Split on unescaped commas only. */
  const rdns = []
  let buf = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '\\') { buf += c + (s[i + 1] || ''); i++; continue }
    if (c === ',') { rdns.push(buf); buf = ''; continue }
    buf += c
  }
  rdns.push(buf)

  for (const raw of rdns) {
    const rdn = raw.trim()
    if (!rdn) return 'A DN cannot contain an empty part — check for a stray comma.'
    /* A multi-valued RDN joins pairs with "+". */
    for (const pair of rdn.split('+')) {
      const eq = pair.indexOf('=')
      if (eq < 0) return `"${pair.trim()}" is missing an "=".`
      const attr = pair.slice(0, eq).trim()
      const val = pair.slice(eq + 1).trim()
      if (!attr) return 'A part is missing its attribute name before the "=".'
      if (!ATTR.test(attr)) {
        return `"${attr}" is not a valid attribute name. Use letters, digits and hyphens, such as CN, OU or DC.`
      }
      if (!val) return `"${attr}" has no value after the "=".`
    }
  }
  return ''
}

/**
 * An LDAP search filter, RFC 4515.
 *
 * Parsed rather than matched. The mistakes people actually make are an
 * unbalanced bracket and a missing outer pair, and a regex can report
 * neither usefully — this says which, and how far off the brackets are.
 */
export function ldapFilter (v) {
  if (!v) return ''
  const s = String(v).trim()

  if (!s.startsWith('(')) return 'A filter must be wrapped in brackets, such as (objectClass=user).'
  if (!s.endsWith(')')) return 'The filter is missing its closing bracket.'

  let depth = 0
  let opened = 0
  let closed = 0
  for (const c of s) {
    if (c === '(') { depth++; opened++ }
    else if (c === ')') { depth--; closed++; if (depth < 0) break }
  }
  if (depth !== 0 || closed > opened) {
    return `Unbalanced brackets: ${opened} opened, ${closed} closed.`
  }

  /* Walk it properly, so "(&(a=b)" and "(&)" are both caught. */
  let i = 0
  function parse () {
    if (s[i] !== '(') return `Expected "(" at position ${i + 1}.`
    i++
    const op = s[i]
    if (op === '&' || op === '|' || op === '!') {
      i++
      let n = 0
      while (s[i] === '(') {
        const err = parse()
        if (err) return err
        n++
      }
      if (n === 0) return `"${op}" must be followed by at least one bracketed condition.`
      if (op === '!' && n > 1) return '"!" takes exactly one condition.'
    } else {
      /* A simple item: attribute, operator, value. */
      const start = i
      while (i < s.length && s[i] !== ')') i++
      const item = s.slice(start, i)
      const m = item.match(/^([A-Za-z][A-Za-z0-9-]*|\d+(?:\.\d+)+)(=|~=|>=|<=)(.*)$/)
      if (!m) {
        return item.includes('=')
          ? `"${item}" does not start with a valid attribute name.`
          : `"${item}" is missing a comparison such as "=".`
      }
      if (m[3] === '' ) return `"${m[1]}" has no value after "${m[2]}".`
    }
    if (s[i] !== ')') return 'A condition is missing its closing bracket.'
    i++
    return ''
  }

  const err = parse()
  if (err) return err
  if (i !== s.length) return 'There is text after the final bracket.'
  return ''
}

/* ---------------------------------------------------------------- people */

/* Deliberately not the RFC 5322 monster: this is the check a sign-up form
   should make, which is "one @, something either side, a dotted domain". */
export function email (v) {
  if (!v) return ''
  const s = String(v).trim()
  const at = s.split('@')
  if (at.length !== 2) {
    return at.length < 2 ? 'An email address needs an "@".' : 'An email address can only contain one "@".'
  }
  if (!at[0]) return 'There is nothing before the "@".'
  if (/\s/.test(s)) return 'An email address cannot contain spaces.'
  return fqdn(at[1]) ? 'The part after the "@" is not a valid domain.' : ''
}

/** user@domain — what AD calls a User Principal Name. */
export function upn (v) {
  if (!v) return ''
  return email(v) ? 'A UPN looks like name@domain, such as a.menon@corp.example.com.' : ''
}

export function macAddress (v) {
  if (!v) return ''
  const s = String(v).trim()
  if (!/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i.test(s)) {
    return 'A MAC address is six pairs of hex digits, such as 3c:22:fb:0a:91:7e.'
  }
  return ''
}

export function url (v) {
  if (!v) return ''
  const s = String(v).trim()
  let u
  try { u = new URL(s) } catch { return 'Not a valid URL — include https://.' }
  if (!/^https?:$/.test(u.protocol)) return 'The URL must start with http:// or https://.'
  if (!u.hostname) return 'The URL has no host.'
  return ''
}

/* ------------------------------------------------------------------ wiring */

export const FORMATS = {
  ipv4, cidr, fqdn, host, port, portRange, portList, dn, ldapFilter, email, upn, macAddress, url
}

/**
 * The one entry point the form calls.
 *
 * `f.format` names a checker; anything unknown is ignored rather than
 * throwing, so a typo in a field definition cannot stop a screen rendering.
 */
export function checkField (f, value) {
  if (!f?.format) return ''
  const fn = FORMATS[f.format]
  if (!fn) return ''
  return fn(value)
}
