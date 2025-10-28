#!/bin/bash

echo "🚀 Deploying Motor M1 to Firebase..."
echo

# Build the Angular app
echo "📦 Building frontend..."
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

# Copy build to motorproxy
echo "📋 Copying build to motorproxy..."
cp -r frontend/dist/motor-m1-app motorproxy/dist/

# Deploy to Firebase
echo "☁️  Deploying to Firebase..."
cd motorproxy
firebase deploy --only hosting,functions

echo "✅ Deployment complete!"
echo "🌐 Frontend: https://studio-534897447-7a1e7.web.app"
echo "⚡ Backend: https://motorproxy-erohrfg7qa-uc.a.run.app"

