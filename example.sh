#!/bin/bash

# This is an example script that demonstrates how to use the gitorial-to-dotcodeschool tool
# It assumes you have already installed the tool and its dependencies

# Check if the gitorial-to-dotcodeschool command is available
if ! command -v gitorial-to-dotcodeschool &> /dev/null; then
    echo "Error: gitorial-to-dotcodeschool command not found."
    echo "Please install it first with: pnpm link --global (or npm link)"
    exit 1
fi

# Example 1: Basic usage with minimal options
echo "Example 1: Basic conversion"
gitorial-to-dotcodeschool \
  -i ./rust-state-machine \
  -o ./output/rust-state-machine-course

# Example 2: Specifying a different branch and additional metadata
echo "Example 2: Conversion with additional metadata"
gitorial-to-dotcodeschool \
  -i ./rust-state-machine \
  -o ./output/rust-state-machine-course-detailed \
  -b gitorial \
  -t "Rust State Machine Tutorial" \
  -a "Shawn Tabrizi" \
  -d "Learn how to build a state machine in Rust" \
  -l "Intermediate" \
  -g "Rust"

# Example 3: Using the master branch if gitorial branch is not available
echo "Example 3: Using the master branch"
gitorial-to-dotcodeschool \
  -i ./rust-state-machine \
  -o ./output/rust-state-machine-course-master \
  -b master \
  -t "Rust State Machine Tutorial (Master Branch)" \
  -a "Shawn Tabrizi" \
  -d "Learn how to build a state machine in Rust" \
  -l "Intermediate" \
  -g "Rust"

echo "Conversion examples completed. Check the ./output directory for results."
