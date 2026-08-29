<template>
  <div class="search">
    <div class="search--search-form form-inline">
      <label class="sr-only">Search</label>
      <input
        class="form-control search-input"
        type="text"
        v-model="filters.search"
        placeholder="Search..."
      >

      <select class="form-control" v-model="filters.size">
        <option value="">Any Size</option>
        <option v-for="size in sizes" :key="size" :value="size">
          {{ size }}
        </option>
      </select>

      <select class="form-control" v-model="filters.type">
        <option value="">Any Type</option>
        <option v-for="type in types" :key="type" :value="type">
          {{ type }}
        </option>
      </select>

      <select class="form-control" v-model="filters.minCr">
        <option value="">Min CR</option>
        <option v-for="cr in crList" :key="cr.string" :value="cr.numeric">
          {{ cr.string }}
        </option>
      </select>

      <select class="form-control" v-model="filters.maxCr">
        <option value="">Max CR</option>
        <option v-for="cr in crList" :key="cr.string" :value="cr.numeric">
          {{ cr.string }}
        </option>
      </select>

      <select class="form-control" v-model="filters.alignment">
        <option value="">Any Alignment</option>
        <option v-for="(alignment, key) in alignments" :key="key" :value="alignment">
          {{ alignment.text }}
        </option>
      </select>

      <select class="form-control" v-model="filters.environment">
        <option value="">Any Terrain</option>
        <option v-for="env in environments" :key="env" :value="env">
          {{ env }}
        </option>
      </select>

      <select class="form-control" v-model="filters.legendary">
        <option value="">Any Legendary</option>
        <option v-for="legendary in legendaryList" :key="legendary" :value="legendary">
          {{ legendary }}
        </option>
      </select>

      <span v-if="savedPools.length > 0">
        <select class="form-control search--search-form--pool-control" v-model="filters.pool">
          <option value="">Any Table</option>
          <option v-for="pool in savedPools" :key="pool.name" :value="pool.name">
            {{ pool.name }} Table
          </option>
        </select>
      </span>

      <select class="form-control search--search-form--sort-control" v-model="filters.sort">
        <option v-for="sortChoice in sortChoices" :key="sortChoice.value" :value="sortChoice.value">
          Sort by {{ sortChoice.text }}
        </option>
      </select>

      <button type="button" class="btn btn-info" @click="showSourcesModal = true">
        Set Sources
      </button>

      <button type="button" class="btn btn-info" @click="showContentModal = true">
        Manage Content
      </button>

      <select class="form-control search--page-size" v-model.number="filters.pageSize">
        <option v-for="size in [10, 25, 50, 100, 250, 500, 1000]" :key="size" :value="size">
          {{ size }} / page
        </option>
      </select>
    </div>

    <div class="search--reset">
      <button class="btn btn-danger" @click="resetFilters">Reset Filters</button>
    </div>

    <!-- Sources Modal -->
    <div v-if="showSourcesModal" class="modal" style="display: block;" @click.self="showSourcesModal = false">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" @click="showSourcesModal = false">
              <span>&times;</span>
            </button>
            <h3 class="modal-title">Set Source Material</h3>
          </div>
          <div class="modal-body">
            <div
              v-for="section in sourceSections"
              :key="section.name"
              class="sources-modal--source-section"
            >
              <button class="btn btn-primary" @click="updateSourceFilters(section.name, true)">
                All
              </button>
              <button class="btn btn-primary" @click="updateSourceFilters(section.name, false)">
                None
              </button>
              <span class="sources-modal--source-section-header">
                {{ section.name }}
              </span>

              <ul>
                <li
                  v-for="source in section.sources"
                  :key="source"
                  class="search--source"
                  :class="{ 'search--source__off': !filters.source[source] }"
                >
                  <label>
                    <input type="checkbox" v-model="filters.source[source]">
                    {{ source }}
                  </label>
                </li>
              </ul>
            </div>
            <div>
              <a href="https://github.com/Asmor/5e-monsters/wiki/Extra-content-for-KFC" target="_blank">
                Add additional content
              </a>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-default" @click="showSourcesModal = false">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Management Modal -->
    <div v-if="showContentModal" class="modal" style="display: block;" @click.self="showContentModal = false">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" @click="showContentModal = false">
              <span>&times;</span>
            </button>
            <h3 class="modal-title">Manage Content</h3>
          </div>
          <div class="modal-body">
            <h5>Your imported content</h5>
            <ul>
              <li v-for="pack in homebrewPacks" :key="pack.name" class="row search--content-row">
                <div class="col-lg-1">
                  <button class="btn btn-danger" @click="removeHomebrew(pack.name)">
                    <i class="fa fa-trash-o"></i>
                  </button>
                </div>
                <div class="col-lg-9">
                  {{ pack.name }} &mdash; {{ pack.rows.length }} monsters
                </div>
              </li>
              <li v-if="homebrewPacks.length === 0" class="row search--content-row">
                <div class="col-lg-12"><em>Nothing imported yet.</em></div>
              </li>
              <li class="row search--content-row">
                <div class="col-lg-12">
                  <input type="file" accept=".csv,.json" @change="handleFileImport">
                  <p class="help-block">
                    A CSV using the same columns as the community sheet template
                    (<code>name, cr, size, type, tags, alignment, environment, ac, hp</code>),
                    or a JSON array of the same. The file is read in your browser and
                    never uploaded.
                  </p>
                </div>
              </li>
            </ul>

            <div v-if="importResult">
              <div v-if="importResult.added" class="alert alert-success">
                Imported {{ importResult.added }} monsters from "{{ importResult.sourceName }}".
              </div>
              <div v-if="importResult.errors.length" class="alert alert-warning">
                <strong>{{ importResult.skipped }} row(s) skipped:</strong>
                <ul>
                  <li v-for="(error, index) in importResult.errors.slice(0, 10)" :key="index">
                    {{ error }}
                  </li>
                </ul>
                <em v-if="importResult.errors.length > 10">
                  …and {{ importResult.errors.length - 10 }} more.
                </em>
              </div>
            </div>

            <h5>Built in</h5>
            <ul>
              <li v-for="content in builtInContent" :key="content.name" class="row search--content-row">
                <div class="col-lg-10">
                  {{ content.name }}
                  <span v-if="content.shortName">({{ content.shortName }})</span>
                </div>
              </li>
            </ul>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-default" @click="showContentModal = false">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMetaInfo, useSources, useFilters, useHomebrew, useLibrary } from '../composables';

const props = defineProps({
  filters: {
    type: Object,
    required: true,
  },
});

const {
  alignments,
  crList,
  environments,
  sizes,
  types,
  legendaryList,
  sortChoices
} = useMetaInfo();

const {
  getSourceSections,
  getContent,
  updateSourceFilters: updateSourcesHelper
} = useSources();

const { resetFilters } = useFilters();
const { packs: homebrewPacks, importFile, remove: removeHomebrewPack, importResult } = useHomebrew();
const { savedEncounters } = useLibrary();

const showSourcesModal = ref(false);
const showContentModal = ref(false);

const sourceSections = computed(() => getSourceSections());
const builtInContent = computed(() => getContent());
const savedPools = computed(() => savedEncounters.value.filter(e => e.type === 'pool'));

const updateSourceFilters = (type, enabled) => {
  updateSourcesHelper({ type, enabled }, props.filters.source);
};

const handleFileImport = (event) => {
  const file = event.target.files[0];
  if (file) {
    importFile(file);
  }
};

const removeHomebrew = (sourceName) => {
  removeHomebrewPack(sourceName);
};
</script>

<style scoped>
.modal {
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-dialog {
  margin-top: 50px;
}
</style>
