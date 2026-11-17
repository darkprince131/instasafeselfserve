<script setup>
import { ref, computed } from 'vue'
import { flatRoutes } from '../router/nav.js'

/**
 * Production's 404, markup-for-markup.
 *
 * It is its own page, not a console screen: a black ground with the sign-in
 * background behind it, a word-search grid spelling 404 / PAGE / NOT / FOUND,
 * a search box over the documentation, and four links. None of it comes from
 * style.css — veno inlines the whole stylesheet in the page, so it is inlined
 * here too, byte-for-byte from the capture, scoped to this component.
 *
 * The search is live rather than decorative: veno's hits the docs site, this
 * one searches the console's own 69 destinations, which is what somebody who
 * mistyped a URL is actually looking for.
 */

const LETTERS = [
  'k', 'v', 'n', 'z', 'i', 'x', 'm', 'e', 't', 'a', 'x', 'l',
  ['4', 'one'], ['0', 'two'], ['4', 'three'],
  'y', 'y', 'w', 'v', 'b', 'o', 'q', 'd', 'y', 'p', 'a',
  ['p', 'four'], ['a', 'five'], ['g', 'six'], ['e', 'seven'],
  'v', 'j', 'a',
  ['n', 'eight'], ['o', 'nine'], ['t', 'ten'],
  's', 'c', 'e', 'w', 'v', 'x', 'e', 'p', 'c', 'f', 'h', 'q', 'e',
  ['f', 'eleven'], ['o', 'twelve'], ['u', 'thirteen'], ['n', 'fourteen'], ['d', 'fifteen'],
  's', 'w', 'q', 'v', 'o', 's', 'm', 'v', 'f', 'u'
].map(x => Array.isArray(x) ? { ch: x[0], cls: 'selected ' + x[1] } : { ch: x, cls: '' })

const query = ref('')
const DESTINATIONS = flatRoutes()

const hits = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return DESTINATIONS
    .filter(d => d.label.toLowerCase().includes(q) || d.to.toLowerCase().includes(q))
    .slice(0, 8)
})
</script>

<template>
  <div class="background-container" />
  <div id="wrap">
    <div id="wordsearch">
      <ul>
        <li v-for="(l, i) in LETTERS" :key="i" :class="l.cls">{{ l.ch }}</li>
      </ul>
    </div>
    <div id="main-content">
      <h3>We couldn't find what you were looking for.</h3>
      <div id="search">
        <form id="doc-search-form" @submit.prevent>
          <input
            type="text" id="doc-search-input" placeholder="Search"
            autocomplete="off" v-model="query"
          >
        </form>
        <ul id="search-results" :style="{ display: query.trim() ? 'block' : 'none' }">
          <li v-for="h in hits" :key="h.to">
            <RouterLink :to="h.to">{{ h.label }}<span style="opacity:.6"> — {{ h.to }}</span></RouterLink>
          </li>
          <li v-if="query.trim() && !hits.length" class="not-found">Nothing in the console matches that.</li>
        </ul>
      </div>

      <div id="navigation">
        <RouterLink class="navigation" to="/dashboard">Home</RouterLink>
        <a class="navigation" href="https://instasafe.com/" target="_blank" rel="noopener">About Us</a>
        <a class="navigation" href="http://docs.instasafe.com/" target="_blank" rel="noopener">Docs</a>
        <a class="navigation" href="http://support.instasafe.com/" target="_blank" rel="noopener">Contact</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Veno inlines all of this in the page itself; it is reproduced verbatim.
   `.background-container` is restated here because pagescss.css defines it
   with its own gradient and this page uses a darker one. */
.background-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  background-image:
    linear-gradient(45deg, #000000b3, #0000004d),
    radial-gradient(circle at top right, rgba(79, 77, 192, .5), transparent 50%),
    radial-gradient(circle at bottom left, rgba(246, 92, 128, .5), transparent 50%),
    var(--login-background);
  background-size: cover;
  background-position: center;
}

#wrap {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 80%;
  max-width: 1400px;
  margin: 8% auto 0 auto;
  position: relative;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: white;
}

#wordsearch { width: 45%; order: 1; }

#main-content {
  width: 50%;
  order: 2;
  font-weight: 300;
  font-size: 20px;
  line-height: normal;
}

#main-content h3 { margin-top: 0; font-weight: 400; font-size: 32px; margin-bottom: 25px; }
#main-content p { font-size: 20px; margin-bottom: 18px; }

#navigation { margin-top: 2%; }

#navigation a.navigation {
  display: block;
  float: left;
  background-color: rgba(255, 255, 255, .05);
  padding: 0 15px;
  color: white;
  height: 41px;
  line-height: 41px;
  font-size: 16px;
  margin-right: 2%;
  margin-bottom: 2%;
  border-bottom: none;
  transition: all 0.5s ease;
  text-decoration: none;
}

#navigation a.navigation:hover { background-color: #ef5137; }

#wordsearch ul { margin: 0; padding: 0; list-style: none; }

#wordsearch ul li {
  float: left;
  width: 12%;
  background-color: rgba(255, 255, 255, .05);
  margin-right: 0.5%;
  margin-bottom: 0.5%;
  padding: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  font-size: 26px;
  font-weight: 300;
  transition: background-color 0.75s ease;
}

#wordsearch ul li.selected { background-color: #ef5137; color: #fff; font-weight: 400; }

#search { position: relative; margin-top: 30px; }

#doc-search-input {
  width: 100%;
  height: 41px;
  padding: 0 15px;
  box-sizing: border-box;
  background-color: rgba(255, 255, 255, 0.05);
  border: none;
  outline: none;
  font-size: 16px;
  font-weight: 300;
  color: white;
  border-radius: 0;
  transition: all 0.3s ease;
}

#doc-search-input:focus { background-color: rgba(255, 255, 255, 0.1); }

#search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 5px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  padding: 0;
  line-height: 1.6;
  margin: 0;
}

#search-results li { list-style: none; }

#search-results li a {
  display: block;
  padding: 8px 12px;
  color: white;
  text-decoration: none;
  transition: background 0.2s;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

#search-results li a:hover {
  background: rgba(255, 255, 255, 0.1);
  border-bottom-color: rgba(255, 255, 255, 0.2);
}

#search-results li.not-found {
  text-align: center;
  color: white;
  padding: 8px 12px;
  cursor: default;
  line-height: 1.6;
}

#search-results::-webkit-scrollbar { width: 6px; }
#search-results::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.3); border-radius: 3px; }

@media (max-width: 899px) { #wrap { width: 90%; } }

@media (max-width: 799px) {
  #wrap { flex-direction: column; margin-top: 40px; }
  #wordsearch { width: 90%; margin: 0 auto 30px auto; }
  #main-content { width: 90%; max-width: 90%; margin: 0 auto; text-align: justify; }
  #main-content h3 { text-align: left; }
  #wordsearch ul li { font-size: 5vw; }
}
</style>
