# 🚀 Firebase Deployment Setup

## GitHub Actions Automatic Deployment

This repository is configured to automatically deploy to Firebase when code is pushed to the `main` branch.

### 📋 Prerequisites

1. **Firebase Project**: `studio-534897447-7a1e7`
2. **GitHub Repository Secrets** (Required for CI/CD)

### 🔑 Setting Up GitHub Secrets

#### Step 1: Generate Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/project/studio-534897447-7a1e7/settings/serviceaccounts/adminsdk)
2. Navigate to **Project Settings** → **Service Accounts**
3. Click **Generate New Private Key**
4. Download the JSON file

#### Step 2: Add Secret to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `FIREBASE_SERVICE_ACCOUNT`
5. Value: Paste the entire contents of the JSON file
6. Click **Add secret**

### ⚙️ Workflow Configuration

The workflow is located at `.github/workflows/deploy-firebase.yml`

**Triggers:**
- Automatic: Every push to `main` branch
- Manual: Can be triggered from GitHub Actions tab

**Build Steps:**
1. ✅ Checkout code
2. ✅ Setup Node.js 18
3. ✅ Cache dependencies
4. ✅ Install frontend dependencies
5. ✅ Build Angular application
6. ✅ Copy build to motorproxy directory
7. ✅ Deploy to Firebase Hosting

### 🔧 Manual Deployment

If you prefer manual deployment:

```bash
bash deploy.sh
```

This script will:
- Install dependencies
- Build the frontend
- Copy files to motorproxy
- Deploy to Firebase (hosting + functions)

### 🌐 Deployment URLs

- **Frontend:** https://studio-534897447-7a1e7.web.app
- **Backend:** https://motorproxy-erohrfg7qa-uc.a.run.app
- **Firebase Console:** https://console.firebase.google.com/project/studio-534897447-7a1e7/overview

### 🐛 Troubleshooting

#### "Error generating service identity for pubsub.googleapis.com"

This is a Firebase permissions issue. Workaround:
```bash
# Deploy only hosting (frontend)
cd motorproxy
npx firebase-tools deploy --only hosting
```

#### GitHub Action Fails

1. Check that `FIREBASE_SERVICE_ACCOUNT` secret is set correctly
2. Verify the service account has proper permissions
3. Check workflow logs for specific errors

#### Build Fails

- Ensure Node.js version 18 is used
- Clear cache: `rm -rf node_modules package-lock.json && npm install`
- Check for TypeScript/Angular errors in build logs

### 📊 Monitoring Deployments

View deployment status:
- **GitHub Actions:** Repository → Actions tab
- **Firebase Console:** Project → Hosting/Functions

### 🔄 Rollback

To rollback to a previous deployment:

```bash
cd motorproxy
firebase hosting:rollback
```

Or select a previous version in Firebase Console → Hosting → Release history

