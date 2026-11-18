# The trial as a journey, not a console

**The shift this records.** Until now the trial layer was something to hide: the
console had to read as production, and every trial affordance was a difference a
visitor might spot. That stands for *chrome* — the shell, the lists, the forms. It
no longer stands for the *journey*. The dummy states, the prefilled forms, the
spotlight and Pip stay, and they become the product rather than an apology.

A visitor who signs up has not come to admire a console. They arrived carrying one
problem. The trial's job is to find out which, and put them inside the flow that
solves it — in their own vocabulary, not ours.

---

## 1 · Who signs up

InstaSafe sells Zero Trust access. The self-serve visitor is not the economic
buyer; they are the person told to go and look.

| | |
|---|---|
| Title | Network / security / IT admin. Sometimes an IT head at a smaller firm. |
| Company | 200–5,000 seats. BFSI, ITeS, manufacturing, healthcare. India, SEA, Middle East. |
| In hand | A VPN they inherited, an auditor's finding, or a directory they just bought. |
| Not in hand | Budget authority, or time. They have an afternoon. |
| Also arriving | MSPs and resellers sizing the product for a client. Same flows, different motive. |

**What this means for the design.** They are hands-on and sceptical, they have run a
VPN concentrator, and they will try to catch the demo lying. They will not read a
feature list. They *will* type into a form to see whether it answers. So the trial
has to let them do, not watch — and it has to say which parts are real.

### The six triggers

Nobody arrives wanting "ZTNA". They arrive with a sentence:

| They say | They want to see |
|---|---|
| "We're ripping out the VPN." | An app reachable without a tunnel, and what the agent changes |
| "The auditor wants MFA everywhere." | MFA they can enrol — **including at Windows logon** |
| "Contractors need one app, not the network." | Clientless access to a single app, nothing else exposed |
| "We bought Entra / Okta — connect our apps." | SSO, a real assertion, a user moved onto the profile |
| "Half the laptops are unmanaged." | Device binding, and posture refusing a device |
| "Access should depend on where and when." | Conditional access — geo, shift, risk, in one rule |

Those six are the entry points. Everything else in the console is what they find
*after* the trigger is answered.

---

## 2 · The first ninety seconds

Today sign-up ends on the dashboard with a Quick Start Guide listing five generic
steps. That is a console's onboarding, not a trial's. It assumes the visitor wants
to configure a tenant. Most want to confirm one thing.

**Replace the last sign-up step with the question.** After the tenant name, one
screen: *What brought you here?* — the six triggers as cards, plus "Just looking".
It is the only place the trial asks something production would not, and it earns
its keep: the answer picks the flow, seeds the right dummy state, and orders the
Quick Start list behind it.

Then drop them on the dashboard with the flow already offered, spotlight armed, Pip
holding the first line. Not a menu of seven tours. One flow, the one they asked
for, with the others a click away.

"Just looking" gets the `onboard` flow, which is the honest default — it is the
whole job end to end.

---

## 3 · The flow catalogue

Seven exist and work. They are good; what they lack is a *solution* framing — they
are named after console nouns, and sorted by nothing.

### Keep, re-label against the trigger

| Flow | Today's title | Trigger it answers | Real? |
|---|---|---|---|
| `onboard` | Give someone access to an application | Just looking | mixed |
| `mfa` | Require multi-factor, and watch a user enrol | Auditor wants MFA | **R** — RFC 6238, genuinely verified |
| `sso` | Federate sign-in to an identity provider | Bought Entra / Okta | **S** — real redirect, real assertion, mock IdP |
| `devices` | Enrol a device and enforce posture | Unmanaged laptops | **R** — real fingerprint, real posture evaluation |
| `groups` | Manage access by group, not by person | — (second-order) | **D** |
| `filters` | Filter what people can reach | — (second-order) | **D** |
| `siem` | Wire the logs into a SIEM | — (second-order) | **R** — real syslog/CEF/LEEF |

The last three answer no trigger. They stay, listed under "Once you're running",
below the fold. An evaluator who gets that far is already sold.

### Build — three flows, for three triggers with nothing to point at

**`windows-logon` — MFA at the Windows sign-in screen.**
The deepest MFA question and the one that separates InstaSafe from an app-level MFA
vendor. SCOPE rates it **S**, "pre-logon flow walked through as a simulated agent
session", and it has **no route today** — it is a line in a table, not a screen.
This is the largest build on the list and the most valuable: it is the thing the
auditor-driven visitor actually needs and cannot get from a TOTP demo. The flow
should run the admin side for real (require it, scope it to a group, see enrolment
state) and present the pre-logon moment as an explicit simulation of the machine —
captioned as such, never mimed.

**`conditional` — access that depends on where, when and how risky.**
Everything it needs is already real: the policy engine (**R**), risk profiles
(**R** — score computed from device, geo and time), device checks (**R**),
geo-fences (**S**), shift schedules. What is missing is the flow that *joins* them
into one rule and then makes it refuse. The payoff is the access explorer answering
"can this user reach that app, and why" with the condition named. That explorer is
the single most convincing surface in the product and currently nothing routes to it.

**`clientless-vs-client` — the same app, both ways.**
The VPN-replacement trigger, and the one most often misunderstood on a call. Show
one application reached clientlessly in the browser (**S** — the RDP/SSH session
surface with watermark, copy-paste block and recording), then the same app over the
agent, and state plainly what each gives up. The portal's agent probe is real: it
genuinely fails when no agent is listening, which is the correct state for every
machine in a trial and should be shown as the point, not as a defect.

---

## 4 · What stays, and what it costs

Four things that production does not have. Keeping them is now a decision, not a
leak, and each is listed so nobody files it as a bug.

- **Dummy states.** `console-state.js` presets — *Day one* (empty tenant) and
  *Running tenant* (1,821 users, 775 pending devices). Per-collection switches
  beside them. The empty state is what a prospect's own tenant looks like; the
  seeded one is what it looks like in a year. Both are worth showing, and the
  switch between them is the argument.
- **Prefilled forms.** An evaluator with an afternoon should not type a CIDR.
  Forms in a flow arrive filled with a working value they can edit. Production
  ships none, so this must read as production's own muted hint style — and must
  never prefill a field whose *value* is the thing being demonstrated.
- **Spotlight.** The flow runner's ring. It drops to nothing whenever a sheet or
  modal covers the page, which is correct and should stay — following a form while
  standing on it is worse than not following.
- **Pip.** The assistant, driven off one ref in `guide-bus.js`. It should carry the
  flow's voice and say what is real; it should not become a chatbot.

**The cost, stated honestly.** A visitor who runs the trial and then sees veno will
notice these. That is acceptable where it was not before, because they sit *on top
of* production's chrome rather than replacing it — the shell, the lists, the forms
and the palette underneath stay verbatim. The failure mode to avoid is no longer
"a visitor spots a difference"; it is "a visitor cannot tell what is real".

Which makes one rule absolute: **every simulated step says so, in the step.** The
R/S/D column in `SCOPE.md` is the source of truth, and a flow that claims more than
its rating is the only thing here that would actually lose a deal.

---

## 5 · Order of work

1. **The trigger screen** at the end of sign-up, and the routing behind it. Small,
   and nothing else is worth much without it.
2. **Re-label the seven flows** against the triggers; split the catalogue into
   "answers your question" and "once you're running".
3. **`conditional`** — the cheapest of the three new flows, because every piece it
   needs already evaluates for real.
4. **`clientless-vs-client`** — needs the two surfaces placed side by side and the
   trade-off written; no new engine.
5. **`windows-logon`** — needs a screen that does not exist. Largest, highest value,
   and the one to get right rather than quickly.
6. **Prefilled values** across the flows above, once each flow's shape is settled.

The end-user portal re-skin runs on its own track and blocks none of this.
