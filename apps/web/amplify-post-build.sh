#!/bin/bash
# Generate .amplify-hosting directory for Amplify WEB_COMPUTE deployment
set -e

echo "Generating .amplify-hosting deployment structure..."

rm -rf .amplify-hosting
mkdir -p .amplify-hosting/compute/default
mkdir -p .amplify-hosting/static/_next/static

# In a monorepo, standalone output has server.js at apps/web/server.js
# Copy the whole standalone output first
cp -r .next/standalone/. .amplify-hosting/compute/default/

# Move server.js and .next from the monorepo nested path to compute root
if [ -f ".amplify-hosting/compute/default/apps/web/server.js" ]; then
  # Create a wrapper server.js at root that points to the monorepo path
  cat > .amplify-hosting/compute/default/run.js << 'WRAPPER'
// Wrapper to set correct working directory for monorepo standalone
process.chdir(__dirname + '/apps/web');
require('./apps/web/server.js');
WRAPPER
  # Update entrypoint to run.js
  ENTRYPOINT="run.js"
  echo "Using monorepo wrapper: run.js -> apps/web/server.js"
else
  ENTRYPOINT="server.js"
  echo "Using root server.js"
fi

# Copy static assets into the nested .next directory
cp -r .next/static/. .amplify-hosting/compute/default/apps/web/.next/static/ 2>/dev/null || \
cp -r .next/static/. .amplify-hosting/compute/default/.next/static/ 2>/dev/null || true

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
      "entrypoint": "${ENTRYPOINT}",
      "runtime": "nodejs20.x"
    }
  ],
  "framework": {
    "name": "next",
    "version": "${NEXT_VERSION}"
  }
}
MANIFEST

echo "Generated .amplify-hosting with deploy-manifest.json (entrypoint: ${ENTRYPOINT})"
echo "Compute root contents:"
ls -la .amplify-hosting/compute/default/
