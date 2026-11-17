<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { NAV } from '../../router/nav.js'

/**
 * Production's sidebar, markup-for-markup.
 *
 * Everything visual here comes out of style.css, which has 22 `!important`
 * rules aimed at this tree. The way to win against that stylesheet is not
 * more specificity — it is to emit the DOM it already expects:
 *
 *   aside.sidebar-wrapper > .sidebar > ul.sidebar-menu
 *     li.is-active            the current page (coral pill, white text)
 *     li.treeview             a group; .active while it is open
 *       a.d-flex > .menu-title + span > i.fa-plus-circle + i.fa-minus-circle
 *       ul.treeview-menu      .d-block while open, .treeview-menu-nested on two
 *
 * Note what is absent: there are no per-item icons. style.css styles
 * `.sidebar-menu > li .fas`, and the only `.fas` production puts there are
 * the two expander glyphs — which is why the plus and the minus are both
 * always in the DOM and the stylesheet shows one and hides the other.
 */

defineProps({ open: Boolean })
const emit = defineEmits(['navigate'])
const route = useRoute()

/** Which groups are expanded. The group holding the current route opens
 *  itself, so arriving by URL never leaves you somewhere with no context. */
const openGroups = ref(new Set())

const isCurrent = (to) => route.path === to
const groupHasCurrent = (item) => (item.children || []).some(c => isCurrent(c.to))

watch(() => route.path, () => {
  for (const item of NAV) {
    if (groupHasCurrent(item)) openGroups.value.add(item.label)
  }
  openGroups.value = new Set(openGroups.value)
}, { immediate: true })

function toggle (item) {
  const s = new Set(openGroups.value)
  s.has(item.label) ? s.delete(item.label) : s.add(item.label)
  openGroups.value = s
}
const isOpen = (item) => openGroups.value.has(item.label)
</script>

<template>
  <aside class="sidebar-wrapper" :class="{ active: open }" id="SideBar">
    <div class="sidebar">
      <ul class="sidebar-menu">
        <li
          v-for="item in NAV" :key="item.label"
          :class="item.to
            ? (isCurrent(item.to) ? 'is-active' : '')
            : ['treeview', isOpen(item) ? 'active' : '']"
        >
          <!-- a destination -->
          <RouterLink v-if="item.to" :to="item.to" class="link" @click="emit('navigate')">
            <span class="menu-title"> {{ item.label }} </span>
          </RouterLink>

          <!-- a group -->
          <template v-else>
            <a href="" class="d-flex justify-content-between align-items-center" @click.prevent="toggle(item)">
              <span class="menu-title">{{ item.label }}<br v-if="item.br"> {{ item.br }}</span>
              <span>
                <i class="fas fa-plus-circle me-3" />
                <i class="fas fa-minus-circle me-3" />
              </span>
            </a>
            <ul
              class="treeview-menu"
              :class="[isOpen(item) ? 'd-block' : '', item.nested ? 'treeview-menu-nested' : '']"
            >
              <li
                v-for="child in item.children" :key="child.to"
                :class="isCurrent(child.to) ? 'is-active' : ''"
              >
                <RouterLink :to="child.to" class="link" @click="emit('navigate')"> {{ child.label }} </RouterLink>
              </li>
            </ul>
          </template>
        </li>
      </ul>
    </div>
  </aside>
</template>
