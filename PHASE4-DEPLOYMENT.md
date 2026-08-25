# Phase 4: Deployment & Documentation

## Current Architecture

### Dual-Runtime Approach

The application currently runs in two modes simultaneously:

1. **AngularJS App** (`localhost:8080`)
   - Serves original AngularJS application
   - Provides service layer via `window` object
   - Required for Vue app to function

2. **Vue 3 App** (`localhost:5173/vue/`)
   - New Vue implementation
   - Consumes AngularJS services via window
   - Fully functional with all features

### Service Dependencies

All Vue composables depend on AngularJS services exposed on `window`:

```javascript
// In app/app.module.js
window.encounterService = encounter;
window.playersService = players;
window.partyInfoService = partyInfo;
window.monstersService = monsters;
window.homebrewService = homebrew;
window.sourcesService = sources;
window.metaInfoService = metaInfo;
window.storeService = store;
window.libraryService = library;
window.integrationService = integration;
window.combatService = combat;
```

### Service Dependency Graph

```
storeService (localStorage wrapper)
  └─> libraryService (saved encounters)
  └─> partyInfoService (party configuration)
  └─> playersService (player data)

monstersService (monster catalog)
  └─> dbService (SQLite)
  └─> homebrewService (custom content)

encounterService (current encounter)
  └─> monstersService
  └─> partyInfoService
  └─> randomencounterService

combatService (battle tracker)
  └─> encounterService
  └─> playersService

sourcesService (content packs)
  └─> miscService (static data)

metaInfoService (metadata)
  └─> miscService
  └─> crInfo, alignments
```

## Deployment Options

### Option 1: Keep Both (Recommended for Now)

**Pros:**
- Zero risk - both versions work
- Users can choose their preferred version
- Fallback available if issues found
- Easy to maintain during transition

**Cons:**
- Larger deployment size
- Two codebases to maintain
- Dependency on AngularJS

**How to Deploy:**
1. Build AngularJS: `npm run build` (when fixed)
2. Build Vue: `npm run build:vue`
3. Serve both from same domain:
   - `/` → AngularJS app
   - `/vue/` → Vue app
4. Add redirect from `/vue` → `/vue/` in server config

### Option 2: Vue with AngularJS Services

**Pros:**
- Single user-facing app (Vue)
- AngularJS only used for services (hidden)
- Modern UX

**Cons:**
- Still depends on AngularJS
- More complex deployment
- Services run in AngularJS context

**How to Deploy:**
1. Build single page that loads both frameworks
2. Bootstrap AngularJS (hidden, services only)
3. Mount Vue app
4. Serve from `/`

### Option 3: Full Service Extraction (Future)

**Pros:**
- Complete Vue migration
- Remove AngularJS entirely
- Smaller bundle size

**Cons:**
- Significant refactoring required
- Risk of bugs during extraction
- Time-consuming

**Required Work:**
- Extract 11 services to plain JS
- Rewrite Angular-specific code ($q, $rootScope, $scope)
- Update all 10 composables
- Extensive testing

**Estimated Effort:** 2-4 weeks

## Recommended Deployment Strategy

### Phase 4a: Prepare for Deployment

1. **Fix AngularJS build** (currently broken)
   - Resolve Gulp optimization issues
   - OR switch to webpack/Vite for AngularJS

2. **Configure Vue production build**
   - Optimize bundle size
   - Add source maps
   - Configure paths for production

3. **Test both apps together**
   - Ensure AngularJS loads first
   - Verify services exposed correctly
   - Test all Vue routes

4. **Document deployment process**
   - Server configuration
   - Build steps
   - Environment variables

### Phase 4b: Deploy Both Versions

1. **Deploy to staging**
   - Both apps accessible
   - Monitor for issues
   - Gather user feedback

2. **Gradual rollout**
   - Link to Vue version from AngularJS
   - "Try the new version" banner
   - Analytics to track adoption

3. **Monitor**
   - Error tracking
   - Performance metrics
   - User feedback

### Phase 4c: Future - Service Extraction

**Only proceed when:**
- Vue version is stable (1+ month in production)
- User adoption is high (>80%)
- Team has capacity for 2-4 week project

**Steps:**
1. Extract services one at a time
2. Start with simple services (store, sources)
3. Test extensively after each extraction
4. Keep AngularJS version as fallback

## Production Build Configuration

### Vue App (`vite.config.js`)

```javascript
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist-vue',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
        }
      }
    }
  },
  server: {
    proxy: {
      '/data': 'http://localhost:8080',
      '/vendor': 'http://localhost:8080',
    }
  }
});
```

### AngularJS App (needs fixing)

Current build is broken. Options:

1. **Fix Gulp** - Resolve uglify/dependency injection issues
2. **Switch to Webpack** - More modern tooling
3. **Leave unminified** - For service layer only, size less critical

## Server Configuration

### Nginx Example

```nginx
server {
    listen 80;
    server_name kobold-fight-club.example.com;

    root /var/www/kobold-fight-club;

    # Vue app
    location /vue/ {
        try_files $uri $uri/ /vue/index.html;
    }

    # AngularJS app (fallback and service provider)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets
    location /data {
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Apache Example

```apache
<VirtualHost *:80>
    ServerName kobold-fight-club.example.com
    DocumentRoot /var/www/kobold-fight-club

    # Vue app
    <Directory /var/www/kobold-fight-club/vue>
        RewriteEngine On
        RewriteBase /vue/
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /vue/index.html [L]
    </Directory>

    # AngularJS app
    <Directory /var/www/kobold-fight-club>
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

## Testing Checklist

### Pre-Deployment

- [ ] All Vue routes work
- [ ] All AngularJS routes work
- [ ] Services accessible from Vue
- [ ] Data persists (localStorage)
- [ ] Filters save/load
- [ ] Encounters save/load
- [ ] Players save/load
- [ ] Monster search works
- [ ] Random encounters generate
- [ ] Battle tracker functions
- [ ] Homebrew import works

### Post-Deployment

- [ ] Both apps accessible
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] Cross-browser compatible

## Current Status

✅ **Complete:**
- All pages migrated to Vue
- All features working
- Dev environment configured

⏳ **In Progress:**
- Production build configuration
- Deployment documentation

❌ **Not Started:**
- Service extraction (future phase)
- AngularJS removal (future phase)

## Recommendation

**For now: Deploy both versions in parallel**

This provides:
- Maximum safety and flexibility
- Time to gather real-world Vue feedback
- Option to rollback to AngularJS if needed
- Path forward for service extraction later

**Timeline:**
- Week 1: Fix builds, test deployment locally
- Week 2: Deploy to staging, monitor
- Week 3-4: Production deployment, monitor
- Month 2+: Gather feedback, plan service extraction if desired

---

**Status**: Documentation Complete
**Date**: 2026-08-23
**Next**: Production build configuration and testing
