<template>
  <div id="app">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <h2>Loading Kobold Fight Club...</h2>
      <p>Loading monster database and saved content...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="loadError" class="error-container">
      <h2>Failed to Load</h2>
      <p class="error-message">{{ loadError }}</p>
      <button @click="retryInitialization" class="btn btn-primary">Retry</button>
    </div>

    <!-- App Content -->
    <div v-else>
      <h1>Kobold Fight Club - Vue Version</h1>
      <nav>
        <router-link to="/">Home</router-link> |
        <router-link to="/encounter-builder">Encounter Builder</router-link> |
        <router-link to="/encounter-manager">Encounter Manager</router-link> |
        <router-link to="/players">Manage Players</router-link> |
        <router-link to="/battle-setup">Battle Setup</router-link> |
        <router-link to="/battle-tracker">Battle Tracker</router-link> |
        <router-link to="/about">About</router-link>
      </nav>
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

// Import all TypeScript services for initialization
import { monsters } from '@/services/monsters';
import { homebrew } from '@/services/homebrew';
import { partyInfo } from '@/services/partyInfo';
import { encounter } from '@/services/encounter';
import { players } from '@/services/players';
import { library } from '@/services/library';

const router = useRouter();
const isLoading = ref(true);
const loadError = ref<string | null>(null);

/**
 * Initialize all services
 */
async function initializeApp(): Promise<void> {
  try {
    console.log('Initializing Kobold Fight Club...');

    // Initialize synchronous services first
    partyInfo.initialize();
    encounter.initialize();
    await players.initialize();

    // Load monster database (critical - must complete before homebrew)
    console.log('Loading monster database...');
    const result = await monsters.load();
    console.log(`Loaded ${result.monsters} monsters from ${result.sources} sources`);

    // Restore homebrew content on top of base monsters
    console.log('Restoring homebrew content...');
    await homebrew.restore();

    // Initialize library (load saved encounters)
    console.log('Loading saved encounters...');
    await library.initialize();

    console.log('✅ Kobold Fight Club initialized successfully');
    isLoading.value = false;
  } catch (error) {
    console.error('❌ Failed to initialize Kobold Fight Club:', error);
    loadError.value = error instanceof Error
      ? error.message
      : 'An unknown error occurred while loading the application.';
    isLoading.value = false;
  }
}

/**
 * Retry initialization after error
 */
function retryInitialization(): void {
  isLoading.value = true;
  loadError.value = null;
  initializeApp();
}

// Initialize on mount
onMounted(() => {
  initializeApp();
});
</script>

<style>
body {
  font-family: 'Open Sans', sans-serif;
  margin: 0;
  padding: 0;
}

#app {
  min-height: 100vh;
}

#app > div > h1 {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f5f5f5;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 6px solid #e0e0e0;
  border-top-color: #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 2rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-container h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.loading-container p {
  margin: 0;
  color: #666;
}

/* Error State */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: #f5f5f5;
}

.error-container h2 {
  color: #d32f2f;
  margin-bottom: 1rem;
}

.error-message {
  color: #666;
  max-width: 600px;
  text-align: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background: white;
  border-radius: 4px;
  border-left: 4px solid #d32f2f;
}

/* Navigation */
nav {
  padding: 1rem;
  border-bottom: 1px solid #ccc;
  margin-bottom: 1rem;
  background: white;
}

nav a {
  margin-right: 1rem;
  color: #2196F3;
  text-decoration: none;
  font-weight: 500;
}

nav a:hover {
  text-decoration: underline;
}

nav a.router-link-active {
  color: #1976D2;
  font-weight: 600;
}

/* Button */
.btn {
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #2196F3;
  color: white;
}

.btn-primary:hover {
  background: #1976D2;
}
</style>
