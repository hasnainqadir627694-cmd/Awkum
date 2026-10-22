# AWKUM ClassHub — Build & Deployment Guide

**Abdul Wali Khan University Mardan · Garden Campus**  
*Document Version: 2.1 · Status: Active Deployment Procedure*

---

## 1. Deployment Architecture Overview

AWKUM ClassHub has two main deployment components:
1. **Frontend Static Assets**: Bundled via Vite (`npm run build`) into `dist/` containing optimized HTML, CSS, JavaScript, and asset files.
2. **Full-Stack Node.js Server (`server.ts`)**: Runs Express with API endpoints for role verification, Cloudinary file proxying, and Firebase Admin operations.
3. **Firestore Security Rules (`firestore.rules`)**: Deployed directly to the Firebase Cloud infrastructure via the Firebase CLI.

---

## 2. Pre-Deployment Checklist

Before triggering a production build:
- [ ] Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
- [ ] Run automated RBAC test script (`node -e "..."` in `TESTING.md`) to verify access controls.
- [ ] Confirm `.env.example` has all required variables documented without real secrets.
- [ ] Ensure `firestore.rules` is updated and tested.
- [ ] Verify that no hardcoded test accounts or debug bypasses exist in `App.tsx` or `server.ts`.

---

## 3. Build Commands

```bash
# Clean previous builds
npm run clean

# Type-check TypeScript codebase
npm run lint

# Compile production client bundle into /dist
npm run build
```

The output in `dist/` contains:
- `index.html` with optimized meta tags and asset links.
- `assets/index-[hash].js` (minified application logic).
- `assets/index-[hash].css` (compiled Tailwind CSS v4 bundle).

---

## 4. Hosting & Deployment Options

### Option A: Full-Stack Container / Cloud Run Deployment (Standard AI Studio Environment)
In this environment, the application is packaged as a Node.js web service running `server.ts`:

1. **Package.json Start Script**:
   ```json
   "scripts": {
     "start": "tsx server.ts"
   }
   ```
2. **Server Execution**:
   In production (`NODE_ENV=production`), `server.ts` statically serves the built `dist/` folder for all frontend routes while handling `/api/*` requests:
   ```typescript
   app.use(express.static(path.resolve(__dirname, 'dist')));
   app.get('*', (_req, res) => {
     res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
   });
   ```
3. **Port Binding**: Binds to `process.env.PORT || 3000` on `0.0.0.0`.

### Option B: Firebase Hosting + Cloud Run / Cloud Functions
If splitting static assets onto Firebase Hosting:
```bash
# 1. Build frontend bundle
npm run build

# 2. Deploy static hosting to awku-mardan
firebase deploy --only hosting:app
```

---

## 5. Security Rules Deployment

To deploy updated database rules to the live Cloud Firestore database:
```bash
# Ensure correct project selection
firebase use awku-mardan

# Deploy security rules
firebase deploy --only firestore:rules
```

---

## 6. Post-Deployment Verification

1. **Verify Health Endpoint**:
   ```bash
   curl -s https://<DEPLOYED_DOMAIN>/api/health | jq .
   ```
   *Expected Response*:
   ```json
   {
     "status": "healthy",
     "service": "AWKUM ClassHub Full-Stack API",
     "rbac": { "masterAdmin": "hasnainbuilds724656@gmail.com" },
     "cloudinary": { "status": "connected" }
   }
   ```
2. **Verify Portal Routing**:
   - Access `https://<DEPLOYED_DOMAIN>/` in an incognito window.
   - Confirm `LoginScreen.tsx` loads with proper AWKUM branding and emblem.
3. **Verify Master Admin Access**:
   - Log in using `hasnainbuilds724656@gmail.com`.
   - Confirm Admin Control Room renders.
4. **Verify Class Representative Invariants**:
   - Confirm normal students do not see the CR Panel button in the drawer or on the home dashboard.

---

## 7. Rollback & Disaster Recovery

### Rollback Procedures
1. **Container / Cloud Run Rollback**: In Google Cloud Console $\rightarrow$ Cloud Run $\rightarrow$ Revisions, select the previous stable revision and click **Route 100% Traffic**.
2. **Firebase Rules Rollback**: If a rules change caused regressions, revert `firestore.rules` via Git (`git checkout HEAD~1 firestore.rules`) and re-run `firebase deploy --only firestore:rules`.
