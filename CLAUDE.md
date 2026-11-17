# InstaSafe i365 — self-serve trial

**One sentence:** a live, publicly reachable self-serve trial of the i365 console that
looks *exactly* like the console a customer already runs (`velto` / `veno`), with
self-serve additions — sign-up, provisioning, guided flows — layered on top in the same
visual language.

**Why it exists.** The console redesign (violet/coral, unboxed, Direction G) is good and
is on the roadmap, but it needs real development time. Until it ships, a visitor who tries
the trial and then sees the real product must not notice a difference. A trial in the
redesign's skin would read as a different product and undermine both.

So: **production UI, verbatim. Self-serve features added inside it, never beside it.**

---

## 1 · Where this came from, and what already works

This project is a fork of `C:\InstaSafe ConsoleDesign\repo\console` (branch
`demo-console`, deployed at `instasafe-console-demo.netlify.app`). That codebase is
complete and proven; only its **view layer** is wrong for this purpose.

| | |
|---|---|
| Stack | Vue 3 · Bootstrap **5.3.8** (exact production match) · Font Awesome · Vite |
| Data | IndexedDB in the browser (mock adapter) · Neon + Netlify Functions (http adapter) |
| Routes | **67 destinations, all resolving to something built** |
| Seed | Production scale — 1,820 users · 775 pending devices · 794 event-log rows |

Carried over and **genuinely working — do not rebuild, do not regress**:

- **TOTP MFA.** RFC 6238 over Web Crypto, all 6 published test vectors pass. Google
  Authenticator works against it; a wrong code is rejected.
- **Policy engine.** Walks access rules in priority order, reports which rule decided,
  which were shadowed, whether posture overrode an allow.
- **Device binding.** Real browser fingerprint; a second enrolment is recognised, not duplicated.
- **Audit trail.** Every action writes to the event log.
- **Posture evaluator**, mock IdP at `/idp` (SAML + OIDC, real redirects, decodable JWT),
  SIEM export in four wire formats, session recording playback, filters with a live matcher.
- **Five guided tours**, Demo Inbox (OTP / magic-link / push destination), demo-state switches.

### The handoff design — keep it
```
src/api/index.js          the contract. Components only ever call api.users.list()
src/api/adapters/mock.js  what ships today: IndexedDB
src/api/adapters/http.js  Neon via Netlify Functions
```
Swapping backends is one import line. **Every `adapter.call` name must exist on *both*
adapters** — adding to one only is the single most expensive mistake this codebase has
made (see §6).

Read `SCOPE.md` for every capability and how real each one can be offline (**R**/**S**/**D**).
Read `VELTO-AUDIT.md` (108 KB) for velto's own columns, forms and behaviours, screen by screen.

---

## 2 · The job: re-skin the view layer to production

Everything in `src/components/` and `src/views/` currently emits `i-*` classes and loads
`src/assets/i365.css` — the redesign's component layer. That is what has to change.

**The real production stylesheets are in this repo, byte-identical to what veno serves:**

```
public/prod/css/vendor.css     262 KB — Bootstrap 5.3.8 at stock, plus vendor
public/prod/css/style.css       31 KB — the app layer, 324 selectors, 352 class names
public/prod/css/pagescss.css   7.7 KB — per-page additions
public/prod/fonts/all.min.css         — Font Awesome, prod's own build
public/prod/webfonts/*.woff2          — all four faces
public/prod/img/, public/prod/ext/    — favicon, signup background, OS icons, company logo
```

Load those three stylesheets and emit the markup below, and the UI *is* production — not
an approximation of it. That is the whole point: fidelity comes from using their CSS, not
from reproducing its output.

### 2.1 · The shell — captured from the live DOM

```html
<header class="header d-flex justify-content-between align-items-center px-3"
        id="Header" data-theme="light" data-type="companyadmin" data-remaining-time="9808">
  <div class="header-left d-flex align-items-center">
    <span><button class="btn btn-sidebar d-block d-lg-none">☰</button></span>
    <a href="/dashboard"><img src="…" alt="Company Logo" class="company-logo"></a>
    <a href="/dashboard" class="company-name d-none d-sm-block"> Veno </a>
  </div>
  <div class="header-center">
    <span class="user-last-login d-none d-xl-block">Last portal login on …</span>
    <span class="user-last-login d-none d-xl-block">Current timezone: Asia/Kolkata</span>
  </div>
  <div class="header-right d-flex align-items-center">
    <div class="… rounded-pill fw-semibold shadow-sm me-3 … timer-green">
      <i class="fa-solid fa-clock"></i><span>02:43:22</span></div>
    <a class="faq me-3 …"><i class="fas fa-question-circle me-1"></i> FAQ </a>
    <a class="help me-3 …"><i class="fas fa-info-circle me-1"></i> Help </a>
    <span class="theme-btn me-3 d-flex align-items-center">
      <input type="checkbox" class="checkbox" id="checkbox">
      <label for="checkbox" class="checkbox-label">
        <span class="side-icon light-side-icon"><i class="fas fa-sun"></i></span>
        <span class="side-icon dark-side-icon"><i class="fas fa-moon"></i></span>
        <span class="ball"><i class="fas fa-sun light-icon"></i><i class="fas fa-moon dark-icon"></i></span>
      </label>
    </span>
    <div class="dropdown">
      <img src="…" class="rounded-circle profile-img" data-bs-toggle="dropdown" role="button">
      <ul class="dropdown-menu dropdown-menu-end">
        <li><a class="dropdown-item" href="/profile">Profile</a></li>
        <li><a class="dropdown-item" href="/mfa-profile">MFA</a></li>
        <li><a class="dropdown-item">Sign out</a></li>
      </ul>
    </div>
  </div>
</header>

<aside class="sidebar-wrapper" id="SideBar">
  <div class="sidebar">
    <ul class="sidebar-menu">
      <li><a href="/dashboard" class="link"><span class="menu-title"> Dashboard </span></a></li>
      …
      <li class="treeview active">
        <a href="" class="d-flex justify-content-between align-items-center">
          <span class="menu-title">Users &amp; Groups </span>
          <span><i class="fas fa-plus-circle me-3"></i><i class="fas fa-minus-circle me-3"></i></span>
        </a>
        <ul class="treeview-menu d-block">
          <li class="is-active"><a href="/users" class="link"> Users </a></li>
          <li><a href="/usergroups" class="link"> User Groups </a></li>
          <li><a href="/limit-exceeders" class="link"> Blocked Users </a></li>
        </ul>
      </li>
    </ul>
  </div>
</aside>

<div class="content-wrapper"><section>
  <div class="container-fluid" id="AllUser" data-type="companyadmin" data-listname="user">
    …page…
  </div>
</section></div>
```

Notes that matter:
- There are **no per-item icons** in the production sidebar. Labels only. Groups expand
  with a `fa-plus-circle` / `fa-minus-circle` pair, not a chevron; `style.css` shows one
  and hides the other.
- A group that wraps uses a literal `<br>` in `.menu-title` (`Controllers &amp; <br> Gateways`).
- Open group = `li.treeview.active` + `ul.treeview-menu.d-block`. Current page = `li.is-active`.
- Deeper groups add `treeview-menu-nested`.

### 2.2 · The list template — 54 screens share it

```html
<div class="container-heading mb-3">
  <h2>Users <a class="info-icon" data-bs-toggle="tooltip" data-bs-placement="bottom"
               aria-label="…"><i class="fas fa-info-circle"></i></a></h2>
</div>
<div class="row mb-2">
  <div class="col-12 col-md-6 d-flex flex-wrap justify-content-start align-items-center">
    <button class="operation-btn btn btn-primary"> Add </button>
    <button class="operation-btn btn btn-primary"> Bulk Ops </button>
    <button class="operation-btn btn btn-success"> CSV </button>
    <button class="operation-btn btn btn-danger"> Delete </button>
  </div>
  <div class="col-12 col-md-6 d-flex justify-content-end align-items-center">
    <input type="search" class="form-control" placeholder="Type keyword and enter to search">
    <span class="fs-6 text-nowrap ms-2">1-4 of 4</span>
    <button disabled class="btn pagination-btn" type="button"><i class="fas fa-chevron-left"></i></button>
    <select name="pageselect" id="pageselect" class="form-select pagination-select">
      <option value="10" selected>10</option><option value="30">30</option><option value="50">50</option>
    </select>
    <button disabled class="btn pagination-btn" type="button"><i class="fas fa-chevron-right"></i></button>
  </div>
</div>
<div class="container-separator"><div class="row"><div class="col-12 col-md-12">
  <div class="table-responsive table-container">
    <table class="table table-hover table-borderless align-middle text-nowrap">
      <thead class="border-bottom table-light">
        <tr><th><input type="checkbox" id="selectAll"></th><th>Name</th>…</tr>
      </thead>
      <tbody>
        <tr>
          <td><input type="checkbox" id="checkbox-678416" value="678416"></td>
          <td class="d-flex align-items-center">
            <a href="/reports/live" class="rounded-circle me-1 d-inline-block status-indicator bg-warning"></a>
            fqdnone one
          </td>
          <td>fqdn1</td><td>local</td>
          <td><span class="badge rounded-pill bg-success"> Active </span></td>
        </tr>
      </tbody>
    </table>
    <div class="text-center m-2" style="display:none">
      <i class="fas fa-frown p-1"></i><span>No results found</span>
    </div>
  </div>
</div></div></div>
```

**Production is boxed, and badges every status.** That is the opposite of the redesign's
contracts (unboxed, colour only on exceptions, `Active` as plain text). Here, production
wins — `bg-success` pills on every Active row, `.table-container` around every table.
The redesign's rules apply to the redesign, not to this project. Do not "improve" the
production look; a visitor spotting a difference is the only failure mode that matters.

### 2.3 · Navigation must go back to production's shape

`src/router/nav.js` re-bins the 19 top-level entries into 7 labelled sections. That was a
redesign decision. **Revert it**: flat `sidebar-menu`, production's own 19 entries in
production's order, max depth 2, labels exactly as captured. Routes are already identical
to production, so only the tree and the labels change.

### 2.4 · What the re-skin must NOT touch

`src/api/**`, `src/api/seed.js`, the policy engine, the TOTP implementation, device
fingerprinting, `netlify/functions/**`, `backend/**`. Those are logic, and they are correct.
This is a view-layer change.

---

## 3 · The self-serve layer — the part production does not have

Production has no sign-up: tenants are provisioned by InstaSafe. This project does, and it
is the reason the project exists.

| | |
|---|---|
| Sign-up | Email → verify → tenant name → their own sandbox, seeded |
| Sign-in gate | `SignIn.vue` exists and works; **the gate was never wired** — visitors currently land straight on the dashboard. Wire it. |
| MFA | Real TOTP, already working. Enrolment is part of first run. |
| First-run flow | Production's own `/dashboard` **Quick Start Guide** panel is the hook — it is already a production surface (captured: `dashboard--dashboard--quick-start-guide`). Extend that, rather than inventing a wizard beside it. |
| Guided flows | Five tours exist. They must be re-dressed in Bootstrap popovers, not the redesign's own tour chrome. |
| Reset | A visitor must be able to put the sandbox back to seeded state. |
| Expiry | A trial ends. Decide what the console says when it does. |

**How to dress a new feature so it reads as production:** use stock Bootstrap 5.3.8
components — `modal`, `offcanvas`, `card`, `nav-tabs`, `alert`, `badge`, `btn-primary`,
`popover` — plus the production class names where one fits (`.operation-btn`,
`.container-heading`, `.info-icon`). Production *is* stock Bootstrap with a thin app layer,
so anything built from stock Bootstrap already belongs. Never introduce a new visual
idiom: no new radii, no new shadows, no new palette.

**The brand is orange `#FF6600` / purple `#660099`.** Violet and coral belong to the
redesign and must not appear here.

---

## 4 · Reference material — pixel-match against it, do not guess

`reference/` (gitignored — it shows a production tenant, and this repo may be public):

```
reference/prod-pages/   20 live DOM snapshots + matching PNGs
reference/_assets/      the CSS, fonts and images those pages link as ../_assets/
reference/prod-css/     the three stylesheets, as captured
```

The snapshots open directly in Chrome and render offline — scripts are stripped, so they
never call an API. Captured states include sign-in (default + validation), the expanded
nav, the user menu, 404, dashboard (light, dark, quick-start-guide), users (default, add,
add-validation, delete-confirm, dark), user groups, devices (default, add), applications,
access rules, gateways add, and the event log.

The full set — **502 snapshots across 72 pages, with a manifest** — stays at
`C:\InstaSafe ConsoleDesign\evidence\capture\`. Pull another state from there when a screen
needs one; do not re-capture and do not guess at a form's fields.

### Render and compare
```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --hide-scrollbars --window-size=1500,1000 --virtual-time-budget=7000 \
  --screenshot="out.png" "file:///C:/InstaSafe SelfServe/reference/prod-pages/users-groups--users--default.html"
```
Shoot the same screen from the running app at the same width and diff them. A screen is
done when a person cannot tell which is which.

---

## 5 · Deploy — "live" is the requirement, not a later step

Netlify, this repo's root (no `base`; exactly one `netlify.toml`, at the root — a second
one in a subfolder won two deploys and double-nested every path).

`npm run dev` and `vite preview` run the **mock** adapter, because `VITE_BACKEND=http` is
only set on Netlify. A bug on the HTTP path — a missing id, a column mismatch, a NOT NULL
— passes locally and fails live. Two separate bugs shipped that way. Anything touching
`src/api/adapters/http.js` or `netlify/functions/` is verified **on the deployed URL**.

Origin is `https://github.com/darkprince131/instasafeselfserve` (public, `main`).
Netlify reads every build setting from `netlify.toml`, so importing the repo needs nothing
typed in: command `npm run build`, publish `dist`, functions `netlify/functions`, Node 22.

**`VITE_BACKEND` decides which adapter ships, and leaving it unset is a working deploy.**
Unset, the site runs the mock adapter: IndexedDB in each visitor's own browser, no
database, every screen and flow live. The cost is that a sandbox lives in one browser on
one device and goes when its storage does. Set it to `http` only once a Neon
`DATABASE_URL` is in the site's env — the HTTP path is the one that cannot be verified
locally, so it goes live after the mock deploy, not with it.

---

## 6 · Gotchas already paid for — do not rediscover

- **Every `adapter.call` name must exist on both adapters.** `auth.login`,
  `auth.setPassword`, `auth.checkInvite`, `auth.invite`, `auth.sendOtp`, `auth.verifyOtp`,
  `auth.logout` existed only in the mock, so the hosted site threw
  `No HTTP implementation for "…"` and nobody could sign in — while `npm run dev` was
  perfect. Before adding an `api.x.y()`, add it to `http.js` too.
- **Clear `busy` in a `finally`, never after the await.** The above surfaced as a button
  stuck on "Checking…" for ever, with no error, because the throw skipped the reset.
- **Seed rows must be uniform — an omitted field is not a null.** The bulk inserter takes
  the union of keys across a chunk, so one row missing a field binds null for it. Against
  a NOT NULL column that fails the whole insert and the tenant ends up with no users. The
  `admin` row has caused this twice.
- **Ids are assigned server-side in `insertRow`.** The mock invents them; the HTTP adapter
  does not, so a create with no id hits a NOT NULL.
- **`/api/health` deliberately does not create a tenant row**, so every other route
  *upserts* it — otherwise a visitor whose first request was health holds an HttpOnly
  cookie naming a row that does not exist and cannot clear it.
- **IndexedDB cannot structured-clone a Vue reactive proxy.** The mock unwraps via
  `plain()`. Keep doing that on any new write path.
- **`:global(...)` eats what follows it.** In an SFC, `:global(html[…]) .pip` compiles to
  `html[…]` alone. Write `html[data-…] .pip` instead; scoped CSS handles it.
- **`style.css` is hostile.** 165 of 324 selectors are 3+ classes deep and 59 are
  `!important`, 22 of those on the sidebar. Do not fight it with more `!important` — emit
  the markup it already expects, and add new rules in a separate layer.
- `NODE_VERSION` must be **22**. Vite 7 needs `^20.19.0 || >=22.12.0`.
- `qrcode`'s `toString` callback resolves asynchronously. Use `create()` and draw the SVG.

---

## 7 · Interaction rules taken from the real console

- **Editing is a row click.** There is no per-row edit button anywhere in production. The
  whole table is `cursor:pointer`; clicking a row opens the record. Do not add pencil icons.
- **One screen differs:** Controllers opens a read-only *View Controller* panel, with an
  Edit button inside it. That is velto's own behaviour — `VELTO-AUDIT.md` §22.
- **Any password signs in, on purpose.** A visitor cannot know a seeded account's password,
  so a real check could only ever refuse them; two people got stuck on that screen. MFA
  still verifies a genuine TOTP code, and `auth.setPassword` still hashes with PBKDF2 and
  still enforces every rule. Every sign-in screen says so rather than implying a check it
  does not make.

---

## 8 · Decided

All five were taken on their stated defaults. Each is recorded where it
lives in the code, not only here.

1. **Trial boundary — time-limited, 14 days.** `src/lib/trial.js`. A seat
   limit would collide with the 1,821 seeded users, and the seeded scale is
   the thing worth showing. Three days out the console shows a stock
   `.alert.alert-warning`; at zero, a modal with no close that says the
   sandbox is still there and nothing in it was deleted
   (`components/trial/TrialExpiry.vue`).
2. **One sandbox per visitor**, which is what the forked code already does —
   IndexedDB locally, a cookie and a Neon row when hosted.
3. **Lead capture — a work e-mail, kept locally.** Sign-up refuses the common
   free-mail domains and sends a six-digit code to the Demo Inbox. Nothing is
   sent anywhere, and the screen says so, including printing the code.
4. **Tenant logo stays InstaSafe's.** The tenant *name* is what changes, in
   `.company-name` beside the logo, where veno prints "Veno". A customer's own
   mark belongs on the end-user portal, which is where most ZTNA vendors
   allow it.
5. **Sort and the column chooser are gone; the access explorer and the flows
   stay.** The first two sat inside the list template, which is where a
   difference is most visible. The explorer and the agent are listed after
   production's 19 sidebar entries and marked `trial: true` in
   `src/router/nav.js`.

### Differences a visitor could still see

Honest list, so nobody has to rediscover them:

- **A "Trial" link in the header**, left of FAQ, wearing production's own
  `.help` class. It opens the offcanvas holding the Demo Inbox, the guided
  flows, the empty-state switches and the sandbox reset. The alternative was
  adding rows to the avatar dropdown, which is one of the captured states and
  has to keep its three.
- **Two extra sidebar entries**, Access Explorer and Desktop Agent, after
  production's 19.
- **`/signup` has no capture to match**, because production has no sign-up at
  all. It is built from the sign-in page it sits beside.
- **Field hints on some forms.** Production ships none. They are rendered in
  production's own muted style and only where a field is genuinely ambiguous.
- **Confirm dialogs name what they are about to delete.** The heading, the
  glyph and the button label are production's exactly; the sentence between
  them is not.
