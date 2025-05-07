#!/bin/bash

# This script verifies that all necessary files are in place and executable

set -e # Exit on error

echo "Verifying gitorial-to-dotcodeschool setup..."

# Check for required files
required_files=(
  "index.js"
  "package.json"
  "README.md"
  "example.sh"
  "test.sh"
  "install.sh"
  ".gitignore"
  "LICENSE"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file exists"
  else
    echo "❌ $file is missing"
    exit 1
  fi
done

# Check if scripts are executable
executable_scripts=(
  "index.js"
  "example.sh"
  "test.sh"
  "install.sh"
)

for script in "${executable_scripts[@]}"; do
  if [ -x "$script" ]; then
    echo "✅ $script is executable"
  else
    echo "❌ $script is not executable"
    echo "   Run: chmod +x $script"
    exit 1
  fi
done

# Check for Node.js
if command -v node &> /dev/null; then
  node_version=$(node -v)
  echo "✅ Node.js is installed ($node_version)"
else
  echo "❌ Node.js is not installed"
  echo "   Please install Node.js (version 14 or higher)"
  exit 1
fi

# Check for package manager
if command -v pnpm &> /dev/null; then
  echo "✅ pnpm is installed"
  package_manager="pnpm"
elif command -v npm &> /dev/null; then
  echo "✅ npm is installed"
  package_manager="npm"
else
  echo "❌ Neither pnpm nor npm is installed"
  echo "   Please install a package manager"
  exit 1
fi

echo ""
echo "All checks passed! Your gitorial-to-dotcodeschool setup is ready."
echo ""
echo "Next steps:"
echo "1. Install dependencies: $package_manager install"
echo "2. Link the package globally: $package_manager link --global"
echo "3. Run the test script: ./test.sh"
echo "4. Try the example script: ./example.sh"
echo ""
echo "Or simply run the installation script: ./install.sh"
