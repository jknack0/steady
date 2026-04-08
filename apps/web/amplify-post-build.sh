#!/bin/bash
# Generate .amplify-hosting directory for Amplify WEB_COMPUTE deployment
set -e

echo "Generating .amplify-hosting deployment structure..."
echo "Checking standalone output structure..."
ls -la .next/standalone/ 2>/dev/null || true
ls -la .next/standalone/apps/web/ 2>/dev/null || true

rm -rf .amplify-hosting
mkdir -p .amplify-hosting/compute/default
mkdir -p .amplify-hosting/static/_next/static

# Copy standalone server
cp -r .next/standalone/. .amplify-hosting/compute/default/

# The .next dir in standalone for monorepo is at apps/web/.next
# Copy static assets there
if [ -d ".amplify-hosting/compute/default/apps/web/.next" ]; then
  cp -r .next/static/. .amplify-hosting/compute/default/apps/web/.next/static/
  echo "Copied static to monorepo path: apps/web/.next/static"
elif [ -d ".amplify-hosting/compute/default/.next" ]; then
  cp -r .next/static/. .amplify-hosting/compute/default/.next/static/
  echo "Copied static to root path: .next/static"
else
  mkdir -p .amplify-hosting/compute/default/.next/static
  cp -r .next/static/. .amplify-hosting/compute/default/.next/static/
  echo "Created and copied static to .next/static"
fi

# Copy static assets for CDN serving
cp -r .next/static/. .amplify-hosting/static/_next/static/

# Copy public assets to static directory
if [ -d "public" ]; then
  cp -r public/. .amplify-hosting/static/
fi

# Generate deploy-manifest.json
NEXT_VERSION=$(node -e "console.log(require('next/package.json').version)")
cat > .amplify-hosting/deploy-manifest.json << MANIFEST
{
  "version": 1,
  "routes": [
    {
      "path": "/_next/static/*",
      "target": {
        "kind": "Static"
      }
    },
    {
      "path": "/*.*",
      "target": {
        "kind": "Static"
      },
      "fallback": {
        "kind": "Compute",
        "src": "default"
      }
    },
    {
      "path": "/*",
      "target": {
        "kind": "Compute",
        "src": "default"
      }
    }
  ],
  "computeResources": [
    {
      "name": "default",
      "entrypoint": "server.js",
      "runtime": "nodejs20.x"
    }
  ],
  "framework": {
    "name": "next",
    "version": "${NEXT_VERSION}"
  }
}
MANIFEST

echo "Generated .amplify-hosting with deploy-manifest.json"
ls -la .amplify-hosting/
ls -la .amplify-hosting/compute/default/
