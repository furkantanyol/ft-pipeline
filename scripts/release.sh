#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if version is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Version number required${NC}"
  echo "Usage: ./scripts/release.sh <version>"
  echo "Example: ./scripts/release.sh 0.3.0"
  exit 1
fi

VERSION="$1"

echo -e "${GREEN}🚀 Starting release process for version ${VERSION}${NC}\n"

# Update version in package.json and index.ts
echo -e "${YELLOW}📝 Updating version to ${VERSION}...${NC}"
cd packages/cli
npm version "$VERSION" --no-git-tag-version
cd ../..

# Update version in src/index.ts
sed -i.bak "s/\.version('[^']*'/\.version('$VERSION'/" packages/cli/src/index.ts
rm packages/cli/src/index.ts.bak

# Run full verification
echo -e "${YELLOW}✅ Running verification suite...${NC}"
pnpm turbo build
pnpm prettier --write .
pnpm turbo lint
pnpm turbo test

# Publish to npm
echo -e "${YELLOW}📦 Publishing to npm...${NC}"
cd packages/cli
npm publish
cd ../..

# Wait a moment for npm to process
echo -e "${YELLOW}⏳ Waiting for npm registry to update...${NC}"
sleep 5

# Download tarball and calculate SHA256
echo -e "${YELLOW}🔐 Calculating SHA256...${NC}"
URL="https://registry.npmjs.org/aitelier/-/aitelier-${VERSION}.tgz"
SHA256=$(curl -sL "$URL" | shasum -a 256 | cut -d ' ' -f 1)

echo -e "${GREEN}SHA256: ${SHA256}${NC}"

# Update Homebrew formula
echo -e "${YELLOW}🍺 Updating Homebrew formula...${NC}"
sed -i.bak "s|url \"https://registry.npmjs.org/aitelier/-/aitelier-.*\.tgz\"|url \"$URL\"|" Formula/aitelier.rb
sed -i.bak "s|sha256 \".*\"|sha256 \"$SHA256\"|" Formula/aitelier.rb
sed -i.bak "s|assert_match \".*\", shell_output|assert_match \"$VERSION\", shell_output|" Formula/aitelier.rb
rm Formula/aitelier.rb.bak

# Commit changes
echo -e "${YELLOW}📝 Committing changes...${NC}"
git add .
git commit -m "chore: release v${VERSION}

- Update package version to ${VERSION}
- Update Homebrew formula SHA256
- Auto-generated release commit

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Create git tag
echo -e "${YELLOW}🏷️  Creating git tag v${VERSION}...${NC}"
git tag -a "v${VERSION}" -m "Release v${VERSION}"

# Push changes and tag
echo -e "${YELLOW}🚀 Pushing to GitHub...${NC}"
git push origin main
git push origin "v${VERSION}"

echo -e "\n${GREEN}✅ Release v${VERSION} completed successfully!${NC}"
echo -e "${GREEN}📦 Published to npm: https://www.npmjs.com/package/aitelier/v/${VERSION}${NC}"
echo -e "${GREEN}🏷️  Tagged in git: v${VERSION}${NC}"
echo -e "${GREEN}🍺 Homebrew formula updated${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "  1. Create GitHub release: https://github.com/furkantanyol/aitelier/releases/new?tag=v${VERSION}"
echo -e "  2. Update CHANGELOG.md if needed"
echo -e "  3. Test installation: ${GREEN}brew upgrade aitelier${NC} or ${GREEN}npm install -g aitelier@${VERSION}${NC}"
