# Motor M1 Project

Monorepo structure for Motor.com M1 application with separate frontend and backend.

## 📁 Project Structure

```
vehicleapi/
├── frontend/          # Angular application
├── motorproxy/        # Firebase Function (proxy + auth)
└── README.md         # This file
```

## 🚀 Quick Start

### Frontend (Angular App)

```bash
cd vehicleapi/frontend
npm install --legacy-peer-deps
npm start
# Runs on http://localhost:4200
```

### Backend (Firebase Function)

```bash
cd vehicleapi/motorproxy
npm install
firebase deploy --only functions
# Deploys to Firebase Cloud Functions
```

## 📡 Architecture

```
User Browser
    ↓
Firebase Hosting
    ↓
Firebase Function (motorproxy)
    ↓
Playwright Authentication (card: 1001600244772)
    ↓
Motor.com M1 API (sites.motor.com/m1)
```

## 🔧 Development

### Frontend
- **Location**: `frontend/`
- **Framework**: Angular 12
- **Dev Server**: `npm start`
- **Build**: `npm run build`

### Backend
- **Location**: `motorproxy/`
- **Runtime**: Node.js 18 (Firebase Functions)
- **Auth**: Playwright with card `1001600244772`
- **Deploy**: `firebase deploy --only functions`

## 🌐 Deployment

Deploy from `motorproxy/` directory:

```bash
# Deploy both frontend and backend
cd vehicleapi/motorproxy
firebase deploy

# Deploy only frontend
firebase deploy --only hosting

# Deploy only backend  
firebase deploy --only functions
```

**Live URLs:**
- **Frontend**: https://studio-534897447-7a1e7.web.app
- **Backend**: https://motorproxy-erohrfg7qa-uc.a.run.app

## 🔐 Authentication

Automatic authentication using Playwright:
- Card: `1001600244772`
- Single server-side session
- Auto-reauthentication on expiration
- No client credentials exposed

## 🤖 CI/CD - GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/self-hosted-ci.yml`) that automatically deploys to Firebase when code is pushed to the `main` branch.

### Setting up Firebase Token for GitHub Actions

To enable automatic Firebase deployment in GitHub Actions:

1. **Generate a Firebase CI token:**
   ```bash
   firebase login:ci
   ```
   This will open a browser for authentication and generate a token.

2. **Add the token to GitHub Secrets:**
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `FIREBASE_TOKEN`
   - Value: Paste the token from step 1
   - Click **Add secret**

3. **The workflow will now automatically deploy to Firebase** when you push to `main`.

**Note:** The deploy script (`deploy.sh`) supports both authenticated (with token) and interactive (without token) modes, so you can still deploy manually without the token.

## 📝 Scripts

### Frontend (`cd vehicleapi/frontend`)
- `npm start` - Start dev server
- `npm run build` - Production build

### Backend (`cd vehicleapi/motorproxy`)
- `npm install` - Install dependencies
- `firebase deploy` - Deploy to Firebase
