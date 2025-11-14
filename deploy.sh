
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

echo "🚀 Deploying Motor M1 to Firebase..."

cleanup() {
	rc=$?
	if [ $rc -ne 0 ]; then
		echo "❌ Deployment failed (exit $rc)"
	fi
}
trap cleanup EXIT

# Build the Angular app
echo "📦 Building frontend..."
if [ -d frontend ]; then
	cd frontend
	if [ -f package-lock.json ]; then
		npm ci --legacy-peer-deps
	else
		npm install --legacy-peer-deps
	fi
	npm run build --if-present
	cd - >/dev/null
else
	echo "⚠️  No frontend directory found; skipping frontend build"
fi

# Copy build to motorproxy (preserve previous structure: motorproxy/dist/motor-m1-app)
echo "📋 Copying build to motorproxy..."
if [ -d frontend/dist/motor-m1-app ]; then
	rm -rf motorproxy/dist/motor-m1-app || true
	mkdir -p motorproxy/dist
	cp -R frontend/dist/motor-m1-app motorproxy/dist/
else
	echo "⚠️  Build output not found at frontend/dist/motor-m1-app — skipping copy"
fi

# Deploy to Firebase
echo "☁️  Deploying to Firebase..."

# Determine authentication method
AUTH_METHOD=""
if [ -n "${FIREBASE_TOKEN:-}" ]; then
	AUTH_METHOD="token"
	echo "   Using CI token authentication"
elif [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
	AUTH_METHOD="service_account"
	echo "   Using service account authentication"
else
	AUTH_METHOD="interactive"
	echo "   Using interactive authentication"
fi

if command -v firebase >/dev/null 2>&1; then
	if [ "$AUTH_METHOD" = "token" ]; then
		firebase deploy --only hosting,functions --token "$FIREBASE_TOKEN"
	else
		# GOOGLE_APPLICATION_CREDENTIALS is automatically used by Firebase CLI
		firebase deploy --only hosting,functions
	fi
elif command -v npx >/dev/null 2>&1; then
	if [ "$AUTH_METHOD" = "token" ]; then
		npx firebase-tools deploy --only hosting,functions --token "$FIREBASE_TOKEN"
	else
		# GOOGLE_APPLICATION_CREDENTIALS is automatically used by Firebase CLI
		npx firebase-tools deploy --only hosting,functions
	fi
else
	echo "❌ Firebase CLI not found. Install it (npm i -g firebase-tools) or ensure npx is available."
	exit 2
fi

echo "✅ Deployment complete!"
echo "🌐 Frontend: https://studio-534897447-7a1e7.web.app"
echo "⚡ Backend: https://motorproxy-erohrfg7qa-uc.a.run.app"

