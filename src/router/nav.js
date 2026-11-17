/**
 * The navigation model — production's own, verbatim.
 *
 * This file used to re-bin production's 19 top-level entries into seven
 * labelled sections. That was a redesign decision and it is reverted here:
 * a visitor who learns this tree in the trial and then opens their own tenant
 * must find the same 19 entries in the same order under the same words.
 *
 * Every label below is transcribed from the live DOM
 * (`reference/prod-pages/global--nav--expanded.html`), capitals included.
 * Where production wraps a label onto a second line it does it with a literal
 * `<br>` inside `.menu-title`, so `br: true` reproduces that rather than
 * leaving the CSS to guess a break point.
 *
 * Shape rules, from style.css:
 *   - no per-item icons. Labels only.
 *   - a group is `li.treeview`; open adds `.active`, and its
 *     `ul.treeview-menu` adds `.d-block`.
 *   - the current page is `li.is-active` (the coral pill).
 *   - `nested: true` adds `treeview-menu-nested`, which production puts on
 *     Authentication Profiles and User Providers and nowhere else.
 *
 * Three entries do not exist in veno and are marked `trial: true`: they are
 * this project's own additions, listed last so production's 19 are untouched
 * in content and order. See CLAUDE.md §8.5.
 */

export const NAV = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Asset Inventory', to: '/asset-inventory' },
  { label: 'Graph', to: '/graph' },
  {
    label: 'Controllers &', br: 'Gateways',
    children: [
      { label: 'Controllers', to: '/controllers' },
      { label: 'Gateways', to: '/gateways' }
    ]
  },
  {
    label: 'General Settings',
    children: [
      { label: 'Company Details', to: '/settings/company-details' },
      { label: 'Subscription Details', to: '/settings/subscription-details' },
      { label: 'SMS Settings', to: '/sms-settings' },
      { label: 'Email Settings', to: '/email-settings' }
    ]
  },
  {
    label: 'Authentication', br: 'Profiles', nested: true,
    children: [
      { label: 'Local', to: '/profile/local' },
      { label: 'Active Directory', to: '/profile/active-directory' },
      { label: 'OpenLDAP', to: '/profile/ldap' },
      { label: 'RADIUS', to: '/profile/radius' },
      { label: 'SAML', to: '/profile/saml' },
      { label: 'OAuth', to: '/profile/oauth' },
      { label: 'OpenID', to: '/profile/openid' },
      { label: 'Passwordless', to: '/profile/passwordless' }
    ]
  },
  {
    label: 'User Providers', nested: true,
    children: [
      { label: 'Azure AD', to: '/profile/azuread' },
      { label: 'Google', to: '/profile/google' },
      { label: 'SCIM Import', to: '/profile/scim-import' }
    ]
  },
  {
    label: 'Users & Groups',
    children: [
      { label: 'Users', to: '/users' },
      { label: 'User Groups', to: '/usergroups' },
      { label: 'Blocked Users', to: '/limit-exceeders' }
    ]
  },
  {
    label: 'User Settings',
    children: [
      { label: 'User Settings', to: '/user-settings' },
      { label: 'Shift Schedules', to: '/time-schedules' },
      { label: 'Risk Profiles', to: '/risk-profiles' },
      { label: 'DNS & WINS', to: '/settings/dns-wins' }
    ]
  },
  {
    label: 'Devices & Checks',
    children: [
      { label: 'Devices', to: '/devices', badgeKey: 'devicesPending' },
      { label: 'Authenticator Devices', to: '/auth-devices' },
      /* Not in veno's own tree; velto has it and the route is built, so it
         stays in the group it belongs to rather than being hidden. */
      { label: 'Software Packages', to: '/software-packages' },
      { label: 'Device Policies', to: '/device-policy' },
      { label: 'Device Checks', to: '/device-checks' },
      { label: 'Geofences', to: '/geo-fences' },
      { label: 'Blocked Apps', to: '/app-blocker' },
      { label: 'Device Updates', to: '/device-updates' }
    ]
  },
  {
    label: 'Filters',
    children: [
      { label: 'URL', to: '/url-filter' },
      { label: 'Content', to: '/content-filter' },
      { label: 'File Type', to: '/filetype-filter' },
      { label: 'Domain Lists', to: '/domainlists' }
    ]
  },
  {
    label: 'Applications',
    children: [
      { label: 'Application Services', to: '/application-services' },
      { label: 'Applications', to: '/applications' },
      { label: 'Application Groups', to: '/application-groups' }
    ]
  },
  { label: 'Access Rules', to: '/access-rules', badgeKey: 'rules' },
  {
    label: 'Logs & Reports',
    children: [
      { label: 'Live Users', to: '/reports/live' },
      { label: 'Live Gateways', to: '/reports/gateway' },
      { label: 'User Last Login Report', to: '/reports/user-last-login' },
      { label: 'Data Usage Report', to: '/reports/data-uses-log' },
      { label: 'Time Usage Report', to: '/reports/time-uses-log' },
      { label: 'Network Test Report', to: '/reports/network-test' },
      { label: 'Risk Report', to: '/reports/anomaly-logs' },
      { label: 'Session Recording', to: '/reports/session-recording' },
      { label: 'Session Log', to: '/reports/session-log' },
      { label: 'Access Log', to: '/reports/access-logs' },
      { label: 'Application Access Log', to: '/reports/application-access-logs' },
      { label: 'Event Log', to: '/reports/event-logs' }
    ]
  },
  {
    label: 'Report Settings',
    children: [
      { label: 'Export Log', to: '/profile/export-log' },
      { label: 'Report Subscriptions', to: '/report-subscriptions' }
    ]
  },
  {
    label: 'Downloads',
    children: [
      { label: 'User Agents', to: '/downloads/user-agents' },
      { label: 'Gateway Agents', to: '/downloads/gateway-agents' }
    ]
  },
  {
    label: 'Sub Admins & Roles',
    children: [
      { label: 'Sub Admins', to: '/sub-admin/all' },
      { label: 'Sub Admin Roles', to: '/sub-admin/roles' }
    ]
  },
  {
    label: 'IDAM',
    children: [
      { label: 'SCIM Export', to: '/scim-export' },
      { label: 'OAuth2 Service', to: '/oauth2-service' },
      { label: 'OpenID Provider', to: '/openid-idp' },
      { label: 'SAML IDP', to: '/saml-idp' },
      { label: 'RADIUS Service', to: '/authserver/radius' }
    ]
  },
  { label: 'Tech Support', to: '/tech-support' },

  /* ---- this trial's own additions, after production's 19 ---------------
     Kept per CLAUDE.md §8.5's default: the explorer and the agent are
     self-serve features, not a restyling of something production has, so
     they read as extra rather than as a difference. */
  { label: 'Access Explorer', to: '/access-explorer', trial: true },
  { label: 'Desktop Agent', to: '/agent', trial: true }
]

/** Flat list of every destination — used to build routes and page titles. */
export function flatRoutes () {
  const out = []
  for (const item of NAV) {
    const parent = [item.label, item.br].filter(Boolean).join(' ')
    if (item.to) out.push({ ...item, parent: null, section: null })
    for (const child of item.children || []) {
      out.push({ ...child, parent, section: null })
    }
  }
  return out
}
