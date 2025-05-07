#!/bin/bash

# This script installs the gitorial-to-dotcodeschool tool and its dependencies

set -e # Exit on error

echo "Installing gitorial-to-dotcodeschool..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    echo "Please install Node.js (version 14 or higher) before continuing."
    echo "Visit https://nodejs.org/ for installation instructions."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
if [ "$NODE_MAJOR_VERSION" -lt 14 ]; then
    echo "Error: Node.js version 14 or higher is required."
    echo "Current version: $NODE_VERSION"
    echo "Please upgrade Node.js before continuing."
    exit 1
fi

# Determine which package manager to use
if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
    echo "Using pnpm as package manager"
elif command -v npm &> /dev/null; then
    PACKAGE_MANAGER="npm"
    echo "Using npm as package manager"
else
    echo "Error: Neither pnpm nor npm is installed."
    echo "Please install a package manager before continuing."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm install
else
    npm install
fi

# Make scripts executable
echo "Making scripts executable..."
chmod +x index.js
chmod +x example.sh
chmod +x test.sh

# Link the package globally
echo "Linking package globally..."
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm link --global
else
    npm link
fi

echo "Installation completed successfully!"
echo "You can now use the gitorial-to-dotcodeschool command."
echo "Try running './example.sh' for usage examples or './test.sh' to verify the installation."
