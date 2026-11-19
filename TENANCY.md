# Who gets a tenant, and what it costs

Written 2026-11-19, when the trial stopped being a demo one person opens and
started being a thing strangers sign up for.

---

## 1 · The number that decides everything

**Every tenant is seeded with 1,820 users, 775 pending devices and 794
event-log rows.** That is the production scale this trial exists to show, and
it is right on the mock adapter, where it costs the visitor's own disk.

On Neon it is a different proposition. A sign-up writes roughly **3,400 rows
before the visitor has done anything**, and those rows are *identical in every
tenant* — the same generated names, the same device list, the same log. Store
them per tenant and a thousand sign-ups is three and a half million rows of
the same data, which is a few hundred megabytes with indexes. Neon's free tier
is 512 MB.

So the cap on sign-ups is not policy. It is arithmetic, and it lands somewhere
around **three hundred tenants** before storage decides for us.

### The fix is to stop storing the seed

A seeded row is deterministic. Given a tenant id and a row number, the same
name comes out every time. So it does not have to be written at sign-up — it
can be generated on read, and only the rows a visitor *changes or creates*
need to exist.

```
tenant costs =  what they created           (tens of rows)
             +  what they edited of the seed (usually nothing)
             +  one tenants row
```

That turns a tenant from ~3,400 rows into ~10, and the storage question
disappears for any sign-up volume this will see. It is also why
`src/lib/limits.js` counts **creations** rather than totals: the number it
tracks is the number that costs money.

This is the single highest-value change before the hosted build opens, and it
is bigger than it looks — `netlify/functions/api.mjs` would need a read path
that merges generated rows with stored ones. Worth scoping properly rather
than doing in passing.

---

## 2 · Auto-grant, with revoke. Not manual approval.

**The recommendation: grant immediately, keep the power to revoke.**

Manual approval is the wrong default for a self-serve trial, for one reason
that outweighs the rest: a visitor who signs up and is told to wait has
already gone. The entire argument for self-serve is that somebody curious at
22:40 can be inside the console at 22:41. Putting a person in that path
removes the only advantage the channel has — and it puts them there at the
worst moment, because approving sign-ups is dull work that gets batched to the
morning.

What manual approval is actually *for* is stopping abuse and controlling cost.
Both are better handled after the fact:

| Risk | Manual approval | Auto-grant + revoke |
|---|---|---|
| Someone burns storage | prevented | capped by §3, revoked if needed |
| A competitor looks | not prevented — they will use a work address | same |
| Rubbish sign-ups | prevented, at the cost of every real one waiting | expire by themselves in 14 days |
| A real prospect at midnight | waits until morning, or leaves | is in the console |

The free-mail block already filters the laziest abuse, and the 14-day expiry
means an unused tenant cleans itself up without anybody deciding anything.

**Where a human does belong:** not at the door, but at the two moments that
cost something or mean something —

- **extending a trial** past 14 days,
- **raising a limit** past the defaults in §3.

Both are requests from someone who has already used the product, which is
exactly when a sales conversation is worth having. That inverts the usual
arrangement: instead of a person gating everyone to catch the few, a person
talks to the few who ask.

### What revoke has to mean

Three states, not two, because "gone" and "stopped" are different:

| State | Can sign in | Data kept | Set by |
|---|---|---|---|
| `active` | yes | yes | sign-up |
| `suspended` | no, sees a message | yes | us, or hitting a hard cap |
| `revoked` | no | deleted on next sweep | us |

Suspension must be reversible and must say why, because the first thing it
will be used for is a tenant that tripped a limit, not a tenant that did
something wrong. A suspended visitor who sees "your trial is paused, talk to
us" will write; one who sees a login failure will leave.

---

## 3 · Limits

Implemented in `src/lib/limits.js`, enforced today on the client:

| | Default |
|---|---|
| Users created | 25 |
| Applications | 20 |
| Gateways | 5 |
| Access rules | 30 |
| User groups | 10 |
| Devices | 10 |

**These cap what a visitor adds, not what the sandbox holds.** The sandbox
still shows 1,821 users, because that scale is the argument. Capping the total
would mean deleting the seed, which would make the console look like a toy.

The numbers are deliberately generous against real use and tight against
abuse: nobody evaluating ZTNA needs to create a twenty-first application, and
anybody scripting sign-ups to fill a database hits 20 immediately.

**The client cannot be trusted with this.** `limits.js` is advisory — it stops
the honest visitor from an awkward error and gives them a sentence that says
the number. Before the hosted build is public the same numbers have to be
enforced in `netlify/functions/api.mjs`, inside the create path, against a
count the server does itself.

---

## 4 · The schema this needs

`tenants` today:

```sql
create table tenants (
  id text primary key,
  name text not null,
  is_demo boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz
)
```

What §2 and §3 need added:

```sql
alter table tenants add column status text not null default 'active';
  -- active | suspended | revoked
alter table tenants add column status_reason text;
alter table tenants add column status_changed_at timestamptz;
alter table tenants add column plan jsonb not null default '{}'::jsonb;
  -- overrides src/lib/limits.js PLAN, per tenant, so raising one
  -- customer's cap is a row edit and not a deploy
alter table tenants add column contact_email text;
alter table tenants add column signup_ip inet;
  -- the one piece of abuse evidence worth keeping: twenty tenants from one
  -- address is the pattern, and nothing else shows it

create index tenants_status_idx on tenants (status);
create index tenants_expiry_idx on tenants (expires_at) where status = 'active';
```

Counting creations server-side needs either a counter column per kind or a
`count(*)` per create. Prefer the count: it cannot drift, and at these volumes
an indexed `count(*) where tenant_id = $1` is free. A counter that disagrees
with reality is worse than a slightly slower insert.

**Also needed, and not a schema change:** a sweep that moves expired tenants
to `revoked` and deletes revoked rows. `on delete cascade` is already on every
tenant-scoped table, so deleting the `tenants` row is the whole operation —
which is worth keeping true as tables are added.

---

## 5 · Order

1. **Server-side limits** in `api.mjs`. Without these §3 is decoration.
2. **`status` and the suspend path**, so there is a way to stop a tenant that
   is not deleting it.
3. **Lazy seeding** (§1). The big one, and the one that decides whether this
   can be open-ended or has to stay invite-shaped.
4. The expiry sweep.

None of it can be verified locally: `VITE_BACKEND=http` is only set on
Netlify, and `CLAUDE.md` §6 lists two bugs that shipped because of exactly
that. All four want the deployed URL and a Neon database before they are
called done.
