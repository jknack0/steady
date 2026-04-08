#!/bin/bash
# Generate .amplify-hosting directory for Amplify WEB_COMPUTE deployment
set -e

echo "Generating .amplify-hosting deployment structure..."

rm -rf .amplify-hosting
mkdir -p .amplify-hosting/compute/default
mkdir -p .amplify-hosting/static

# Copy standalone server
cp -r .next/standalone/. .amplify-hosting/compute/default/
# Copy static assets into compute (Next.js serves these)
cp -r .next/static .amplify-hosting/compute/default/.next/static
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
