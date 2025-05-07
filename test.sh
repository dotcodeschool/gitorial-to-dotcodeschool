#!/bin/bash

# This script tests the gitorial-to-dotcodeschool tool with a minimal example
# It creates a temporary git repository with a simple gitorial structure

set -e # Exit on error

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Function to clean up on exit
cleanup() {
  echo "Cleaning up..."
  rm -rf "$TEMP_DIR"
}

# Register the cleanup function to be called on exit
trap cleanup EXIT

# Navigate to the temporary directory
cd "$TEMP_DIR"

# Initialize a git repository
echo "Initializing git repository..."
git init
git config --local user.name "Test User"
git config --local user.email "test@example.com"

# Create a simple gitorial structure
echo "Creating gitorial structure..."

# First commit - section
echo "# Test Section" > README.md
git add README.md
git commit -m "section: Test Section"

# Second commit - template
mkdir -p src
echo "// TODO: Implement hello world function" > src/main.js
echo "# Implement Hello World" > README.md
git add .
git commit -m "template: Implement Hello World"

# Third commit - solution
echo "function helloWorld() {\n  return 'Hello, World!';\n}\n\nconsole.log(helloWorld());" > src/main.js
echo "# Hello World Implementation" > README.md
git add .
git commit -m "solution: Implement Hello World"

# Fourth commit - action
echo "# Add Package Configuration" > README.md
echo '{\n  "name": "test-project",\n  "version": "1.0.0"\n}' > package.json
git add .
git commit -m "action: Add Package Configuration"

# Create a branch for the gitorial
git branch gitorial
git checkout gitorial

echo "Gitorial repository created successfully."

# Test the conversion tool
echo "Testing gitorial-to-dotcodeschool tool..."

# Create output directory
OUTPUT_DIR="$TEMP_DIR/output"
mkdir -p "$OUTPUT_DIR"

# Run the conversion tool
cd "$TEMP_DIR"
gitorial-to-dotcodeschool \
  -i "$TEMP_DIR" \
  -o "$OUTPUT_DIR/test-course" \
  -b gitorial \
  -t "Test Course" \
  -a "Test Author" \
  -d "A test course for the gitorial-to-dotcodeschool tool" \
  -l "Beginner" \
  -g "JavaScript"

# Verify the output
echo "Verifying output..."
if [ -f "$OUTPUT_DIR/test-course/test-course.mdx" ]; then
  echo "✅ Course metadata file created successfully."
else
  echo "❌ Course metadata file not found."
  exit 1
fi

if [ -d "$OUTPUT_DIR/test-course/sections/test-section" ]; then
  echo "✅ Section directory created successfully."
else
  echo "❌ Section directory not found."
  exit 1
fi

if [ -d "$OUTPUT_DIR/test-course/sections/test-section/lessons/implement-hello-world" ]; then
  echo "✅ Lesson directory created successfully."
else
  echo "❌ Lesson directory not found."
  exit 1
fi

if [ -d "$OUTPUT_DIR/test-course/sections/test-section/lessons/implement-hello-world/files/template" ] && \
   [ -d "$OUTPUT_DIR/test-course/sections/test-section/lessons/implement-hello-world/files/solution" ]; then
  echo "✅ Template and solution directories created successfully."
else
  echo "❌ Template and solution directories not found."
  exit 1
fi

if [ -d "$OUTPUT_DIR/test-course/sections/test-section/lessons/add-package-configuration/files/source" ]; then
  echo "✅ Source directory created successfully."
else
  echo "❌ Source directory not found."
  exit 1
fi

echo "Test completed successfully! The tool is working as expected."
