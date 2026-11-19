<script setup>
import { computed } from 'vue'
import { tenant, daysLeft, markDone } from '../../lib/trial.js'

/**
 * The Quick Start Guide — production's own modal, extended.
 *
 * Veno already ships this: a `btn-gradient` beside the dashboard title
 * opening `#QuickStartModal`, `modal-xl modal-dialog-centered`, with a
 * `card-close-btn` X in the header. On a fully configured tenant its body
 * says "All configurations are complete!".
 *
 * That is the right hook for first run, and it is why there is no wizard
 * beside it: a visitor who learns this panel in the trial finds the same
 * panel, in the same place, in their own tenant. The only thing added is
 * what goes in the body — the five jobs worth doing first, each a link to
 * the screen that does it, each ticked off when it is actually done.
 */

const props = defineProps({ stats: { type: Object, default: () => ({}) } })
const emit = defineEmits(['close', 'tour'])

/**
 * The jobs worth doing first, in the order an administrator actually does
 * them on an empty tenant.
 *
 * `done` is a predicate over real state wherever one exists, not a flag set
 * when the link was clicked. The guide used to tick a step the moment you
 * opened the screen, which made it a list of places you had been rather than
 * things you had done — and it claimed in its own first line that nothing
 * here is mimed.
 *
 * Only `prove` keeps a clicked flag, because asking the explorer a question
 * leaves nothing behind to detect.
 */
const STEPS = [
  {
    key: 'signin',
    title: 'You are signed in',
    body: 'Your console is empty, the way a real tenant is on day one. The steps below are the order an administrator actually works in, and nothing here is a mock-up — the policy engine evaluates and the authenticator verifies for real.',
    to: null,
    done: () => true
  },
  {
    /* This step did not exist while the trial opened with 1,821 users
       already in it. On an empty tenant everything downstream needs a person:
       there is nobody to enrol an authenticator as, and nobody for a rule to
       be about. */
    key: 'user',
    title: 'Add your first user',
    body: 'Everything else is about somebody. You can add one here, or create one without leaving the form that needs it — the pickers on a rule will offer to make a user that does not exist yet.',
    to: '/users',
    cta: 'Users',
    done: (st) => (st.users || 0) > 0
  },
  {
    key: 'mfa',
    title: 'Enrol an authenticator',
    body: 'Real RFC 6238 TOTP. Scan the QR with Google Authenticator and the six-digit code is genuinely verified — a wrong one is refused. You enrol as the employee, on their own portal, because an administrator cannot scan a QR with a phone they are not holding.',
    to: '/portal/mfa',
    cta: 'Enrol',
    done: (st) => (st.users || 0) > 0 && (st.usersWithoutMfa || 0) < (st.users || 0)
  },
  {
    key: 'gateway',
    title: 'Put an application behind a gateway',
    body: 'A gateway is the data plane. Until an application sits behind one, no rule can reach it.',
    to: '/gateways',
    cta: 'Gateways',
    done: (st) => (st.gateways || 0) > 0 && (st.applications || 0) > 0
  },
  {
    key: 'rule',
    title: 'Write the access rule that joins them',
    body: 'The policy engine really evaluates: it reports which rule decided, which were shadowed, and whether posture overrode an allow.',
    to: '/access-rules',
    cta: 'Access Rules',
    done: (st) => (st.rules || 0) > 0
  },
  {
    key: 'prove',
    title: 'Prove it',
    body: 'Ask the explorer whether a user can reach an application, and read back the reason. Then check the event log — every action you took is in it.',
    to: '/access-explorer',
    cta: 'Access Explorer',
    /* Nothing is left behind by asking a question, so this one is the
       exception that still trusts the click. */
    done: (st, clicked) => !!clicked.prove
  }
]

const clicked = computed(() => tenant.value.done || {})
const isDone = (step) => step.done(props.stats || {}, clicked.value)
const complete = computed(() => STEPS.every(isDone))
const remaining = computed(() => STEPS.filter(s => !isDone(s)).length)

function go (step) {
  /* Only `prove` is recorded on the click; every other step is read back
     from what is actually in the tenant. */
  if (step.key === 'prove') markDone('prove')
  emit('close')
}
</script>

<template>
  <div
    class="modal fade show" tabindex="-1" role="dialog" aria-modal="true"
    aria-labelledby="QuickStartModalLabel" data-bs-backdrop="static" data-bs-keyboard="false"
    style="display:block" id="QuickStartModal"
  >
    <div class="modal-dialog modal-xl modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header d-flex justify-content-between">
          <h5 class="modal-title" id="QuickStartModalLabel">Quick Start Guide</h5>
          <button class="btn card-close-btn float-end" type="button" aria-label="Close" @click="emit('close')">X</button>
        </div>
        <div class="modal-body">
          <div v-if="complete" class="text-center p-4">
            <h4>All configurations are complete!</h4>
            <p>Your setup is finished and everything is configured properly.</p>
          </div>

          <template v-else>
            <p class="mb-3">
              This is the InstaSafe console, in full. {{ remaining }} of
              {{ STEPS.length }} steps left — each one is a real job, done on
              the screen that does it, and nothing here is mimed.
              <span class="fw-semibold">{{ daysLeft }} days left in this trial.</span>
            </p>

            <div class="table-responsive table-container">
              <table class="table table-hover table-borderless align-middle">
                <thead class="border-bottom table-light">
                  <tr><th style="width:40px"></th><th>Step</th><th>What it proves</th><th style="width:160px"></th></tr>
                </thead>
                <tbody>
                  <tr v-for="s in STEPS" :key="s.key">
                    <td>
                      <i
                        class="fas" :class="isDone(s)
                          ? 'fa-check-circle text-success' : 'fa-circle text-body-tertiary'"
                      />
                    </td>
                    <td class="fw-semibold">{{ s.title }}</td>
                    <td class="text-wrap">{{ s.body }}</td>
                    <td>
                      <RouterLink
                        v-if="s.to" class="operation-btn btn btn-primary" :to="s.to"
                        @click="go(s)"
                      > {{ s.cta }} </RouterLink>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p class="mt-3 mb-0">
              Five guided flows walk these end to end, pausing on the screen
              that does the work.
              <a role="button" class="text-decoration-underline" @click="emit('tour', 'onboard')">
                Start with giving someone access to an application
              </a>.
            </p>
          </template>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show" @click="emit('close')" />
</template>
