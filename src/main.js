import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

/**
 * Bootstrap's CSS and Font Awesome are NOT imported from node_modules any
 * more. They come from `/prod/css/vendor.css` and `/prod/fonts/all.min.css`,
 * linked in index.html — veno's own files, byte-identical, so the console
 * cannot drift from the product it is imitating by a patch release.
 *
 * Bootstrap's JavaScript still comes from node_modules: it is behaviour, not
 * appearance, and the bundle is the same 5.3.8.
 *
 * `console.css` is the thin layer underneath: it dresses the components this
 * project added — pickers, sheets, plan lists, the tour — in production's own
 * palette, type and radii, so an added feature reads as part of the product
 * rather than beside it.
 */
import './assets/console.css'
import './assets/app.css'
import './assets/portal.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import { restoreTheme } from './lib/theme.js'
import { restorePortalSession } from './lib/portal-session.js'
import { watchDeployBadge } from './lib/badge-gap.js'

restoreTheme()

// a portal sign-in lives in sessionStorage; pick it up before the first route
restorePortalSession()

createApp(App).use(createPinia()).use(router).mount('#app')

watchDeployBadge()
