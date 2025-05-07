# Gitorial to Dot Code School Converter

A command-line tool to convert courses from the gitorial format to the Dot Code School MDX-based course format.

## Overview

This tool takes a Git repository following the [Gitorial format](https://github.com/gitorial-sdk) and converts it to the Dot Code School MDX-based course format as described in the [Course Contribution Guide](https://dotcodeschool.com/articles/course-contribution-guide).

The conversion process:

1. Extracts content from gitorial commits (section, template, solution, action)
2. Organizes it into the Dot Code School course structure
3. Creates appropriate MDX metadata files
4. Sets up code files in the right format (source or template/solution)

## Installation

### Local Installation

#### Option 0: Verify Setup

Before installation, you can verify that all necessary files are in place and executable:

```bash
# Make the verification script executable (if not already)
chmod +x verify-setup.sh

# Run the verification script
./verify-setup.sh
```

This script checks for:

- All required files
- Executable permissions on scripts
- Node.js installation
- Package manager availability (pnpm or npm)

#### Option 1: Using the Installation Script

```bash
# Clone this repository
git clone https://github.com/dotcodeschool/gitorial-to-dotcodeschool.git

# Navigate to the directory
cd gitorial-to-dotcodeschool

# Run the installation script
./install.sh
```

The installation script will:

- Check if Node.js is installed (version 14 or higher required)
- Detect and use your preferred package manager (pnpm or npm)
- Install dependencies
- Make scripts executable
- Link the package globally

#### Option 2: Manual Installation

```bash
# Clone this repository
git clone https://github.com/dotcodeschool/gitorial-to-dotcodeschool.git

# Navigate to the directory
cd gitorial-to-dotcodeschool

# Install dependencies
pnpm install
# or
npm install

# Make the script executable
chmod +x index.js

# Link the package globally (optional)
pnpm link --global
# or
npm link
```

### Global Installation

```bash
# Using pnpm
pnpm add -g gitorial-to-dotcodeschool

# Using npm
npm install -g gitorial-to-dotcodeschool
```

## Usage

```bash
gitorial-to-dotcodeschool -i <input-repo-path> -o <output-path> [options]
```

### Required Arguments

- `-i, --input <path>`: Path to the gitorial repository
- `-o, --output <path>`: Path to output the Dot Code School course

### Optional Arguments

- `-b, --branch <branch>`: Git branch containing the gitorial (default: 'gitorial')
  - The tool will check for both local and remote branches
  - If the branch exists remotely but not locally, the tool will provide instructions to fetch it
  - For repositories like 'rust-state-machine', you may need to fetch the gitorial branch first:
    ```bash
    cd rust-state-machine
    git fetch origin gitorial:gitorial
    git checkout gitorial
    ```
- `-t, --title <title>`: Course title (default: derived from output directory name)
- `-a, --author <author>`: Course author (default: 'Course Author')
- `-d, --description <description>`: Course description
- `-l, --level <level>`: Course difficulty level (Beginner, Intermediate, Advanced) (default: 'Beginner')
- `-g, --language <language>`: Programming language used in the course

## Examples

### Basic Usage

```bash
gitorial-to-dotcodeschool -i ./rust-state-machine -o ./rust-state-machine-course
```

### Specifying Additional Metadata

```bash
gitorial-to-dotcodeschool \
  -i ./rust-state-machine \
  -o ./rust-state-machine-course \
  -b gitorial \
  -t "Rust State Machine Tutorial" \
  -a "Shawn Tabrizi" \
  -d "Learn how to build a state machine in Rust" \
  -l "Intermediate" \
  -g "Rust"
```

### Using the Example Script

The repository includes an example script that demonstrates how to use the tool:

```bash
# Make the example script executable (if not already)
chmod +x example.sh

# Run the example script
./example.sh
```

## Testing

To verify that the tool is working correctly, you can run the included test script:

```bash
# Make the test script executable (if not already)
chmod +x test.sh

# Run the test script
./test.sh
```

The test script:

1. Creates a temporary git repository with a simple gitorial structure
2. Runs the conversion tool on this repository
3. Verifies that the output has the expected structure
4. Cleans up the temporary files

## Output Structure

The tool generates a course following the Dot Code School structure:

```
output-directory/
├── course-slug.mdx           # Course metadata and description
└── sections/                 # Container for all course sections
    └── section-slug/         # A section of the course
        ├── section-slug.mdx  # Section metadata
        └── lessons/          # Container for all lessons in this section
            ├── lesson-1-slug/    # First lesson directory
            │   ├── lesson-1-slug.mdx  # Lesson content
            │   └── files/        # Optional code files for the lesson
            │       └── source/   # OR template/ and solution/ pair
            └── lesson-2-slug/    # Second lesson directory
                ├── lesson-2-slug.mdx  # Lesson content
                └── files/        # Optional code files
                    ├── template/ # Files with TODOs for learners
                    └── solution/ # Completed files for reference
```

## Mapping from Gitorial to Dot Code School

### From Gitorial Commits

| Gitorial Commit Prefix    | Dot Code School Structure                     |
| ------------------------- | --------------------------------------------- |
| `section:`                | Creates a new section                         |
| `template:` + `solution:` | Creates a lesson with template/solution files |
| `action:`                 | Creates a lesson with source files            |

### From Steps Directory Structure

For repositories like 'rust-state-machine' that use a 'steps' directory structure on the master branch, the tool can also extract content directly from the numbered step directories:

- Each numbered directory in the 'steps' folder becomes a lesson
- The tool extracts the title from the README.md in each step
- Content is organized into sections based on metadata or content patterns
- Files are placed in the appropriate 'source' directory structure

## License

MIT
