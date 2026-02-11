#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if version is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Version number required${NC}"
  echo "Usage: ./scripts/prepare-release.sh <version>"
  echo "Example: ./scripts/prepare-release.sh 0.4.0"
  exit 1
fi

VERSION="$1"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Preparing Release v${VERSION}${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# Update version in package.json
echo -e "${YELLOW}📝 Updating version to ${VERSION}...${NC}"
cd packages/cli
npm version "$VERSION" --no-git-tag-version
cd ../..

# Update version in src/index.ts
sed -i.bak "s/\.version('[^']*'/\.version('$VERSION'/" packages/cli/src/index.ts
rm packages/cli/src/index.ts.bak

echo -e "${GREEN}✓ Version updated${NC}\n"

# Run full verification
echo -e "${YELLOW}🔍 Running verification suite...${NC}"
pnpm turbo build && pnpm prettier --write . && pnpm turbo lint && pnpm turbo test

if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}✅ All checks passed!${NC}\n"
else
  echo -e "\n${RED}❌ Checks failed. Please fix errors before releasing.${NC}\n"
  exit 1
fi

# Show what needs to be done next
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ Release v${VERSION} is ready!${NC}\n"
echo -e "${YELLOW}Next steps (you handle these):${NC}"
echo -e "  ${BLUE}1.${NC} Review the changes:"
echo -e "     ${GREEN}git status${NC}"
echo -e "     ${GREEN}git diff${NC}"
echo -e ""
echo -e "  ${BLUE}2.${NC} Commit the version bump:"
echo -e "     ${GREEN}git add .${NC}"
echo -e "     ${GREEN}git commit -m \"chore: release v${VERSION}\"${NC}"
echo -e ""
echo -e "  ${BLUE}3.${NC} Create and push the tag:"
echo -e "     ${GREEN}git tag -a v${VERSION} -m \"Release v${VERSION}\"${NC}"
echo -e "     ${GREEN}git push origin main${NC}"
echo -e "     ${GREEN}git push origin v${VERSION}${NC}"
echo -e ""
echo -e "  ${BLUE}4.${NC} Watch the CI pipeline:"
echo -e "     ${GREEN}https://github.com/furkantanyol/aitelier/actions${NC}"
echo -e ""
echo -e "${YELLOW}The CI will automatically:${NC}"
echo -e "  ✓ Run tests"
echo -e "  ✓ Publish to npm"
echo -e "  ✓ Create GitHub release"
echo -e "  ✓ Update Homebrew formula"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
