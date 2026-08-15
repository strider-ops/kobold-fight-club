<template>
  <div class="home">
    <h2>Welcome to Kobold Fight Club</h2>
    <p>The encounter building and management tool for D&D 5e.</p>
    <div class="quick-links">
      <h3>Quick Links:</h3>
      <ul>
        <li><router-link to="/encounter-manager">Manage Encounters</router-link></li>
        <li><a href="#/encounter-builder">Encounter Builder (AngularJS)</a></li>
        <li><a href="#/players/manage">Manage Players (AngularJS)</a></li>
      </ul>
    </div>
  </div>
</template>

<script setup>
console.log('Home component loaded');
</script>

<style scoped>
.home {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.home h2 {
  margin-bottom: 1rem;
  color: #333;
}

.home p {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 2rem;
}

.quick-links h3 {
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.quick-links ul {
  list-style: none;
  padding: 0;
}

.quick-links li {
  margin: 0.5rem 0;
}

.quick-links a {
  color: #2196F3;
  text-decoration: none;
  font-size: 1rem;
}

.quick-links a:hover {
  text-decoration: underline;
}
</style>
