<template>
  <div id="app">
    <h1>Kobold Fight Club - Vue Version</h1>
    <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/encounter-manager">Encounter Manager</router-link>
    </nav>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
console.log('App.vue mounted', router);
</script>

<style>
body {
  font-family: 'Open Sans', sans-serif;
}

nav {
  padding: 1rem;
  border-bottom: 1px solid #ccc;
  margin-bottom: 1rem;
}

nav a {
  margin-right: 1rem;
  color: #2196F3;
  text-decoration: none;
}

nav a:hover {
  text-decoration: underline;
}
</style>
