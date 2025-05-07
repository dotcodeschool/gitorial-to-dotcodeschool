#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const { program } = require('commander');

// Define the command-line interface
program
  .name('gitorial-to-dotcodeschool')
  .description('Convert a gitorial format course to Dot Code School MDX-based course format')
  .version('1.0.0')
  .requiredOption('-i, --input <path>', 'Path to the gitorial repository')
  .requiredOption('-o, --output <path>', 'Path to output the Dot Code School course')
  .option('-b, --branch <branch>', 'Git branch containing the gitorial', 'gitorial')
  .option('-t, --title <title>', 'Course title')
  .option('-a, --author <author>', 'Course author')
  .option('-d, --description <description>', 'Course description')
  .option('-l, --level <level>', 'Course difficulty level (Beginner, Intermediate, Advanced)', 'Beginner')
  .option('-g, --language <language>', 'Programming language used in the course')
  .parse(process.argv);

const options = program.opts();

// Helper function to convert a string to a slug
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

// Main function to convert gitorial to Dot Code School format
async function convertGitorialToDotCodeSchool() {
  try {
    console.log('Starting conversion from gitorial to Dot Code School format...');
    
    // 1. Validate input repository
    await validateGitorialRepo(options.input, options.branch);
    
    // 2. Create output directory structure
    await createOutputStructure(options.output);
    
    // 3. Extract gitorial metadata and content
    const gitorialData = await extractGitorialData(options.input, options.branch);
    
    // 4. Generate Dot Code School course structure
    await generateDotCodeSchoolCourse(gitorialData, options);
    
    console.log('Conversion completed successfully!');
  } catch (error) {
    console.error('Error during conversion:', error);
    process.exit(1);
  }
}

// Validate that the input is a git repository with the specified branch
async function validateGitorialRepo(repoPath, branch) {
  try {
    console.log(`Validating gitorial repository at ${repoPath}...`);
    
    // Check if directory exists
    await fs.access(repoPath);
    
    // Check if it's a git repository
    try {
      execSync('git rev-parse --is-inside-work-tree', { 
        cwd: repoPath, 
        stdio: 'ignore' 
      });
    } catch (error) {
      throw new Error(`${repoPath} is not a git repository`);
    }
    
    // Get list of available local branches
    const localBranchesOutput = execSync('git branch', { cwd: repoPath }).toString();
    const localBranches = localBranchesOutput
      .split('\n')
      .map(b => b.trim().replace(/^\*\s+/, ''))
      .filter(Boolean);
    
    // Check if the branch exists locally
    let branchExists = false;
    try {
      execSync(`git show-ref --verify --quiet refs/heads/${branch}`, { 
        cwd: repoPath 
      });
      branchExists = true;
      console.log(`Using local branch: ${branch}`);
    } catch (error) {
      // Branch doesn't exist locally, check if it exists remotely
      try {
        // Try to get remote branches
        const remoteBranchesOutput = execSync('git branch -r', { cwd: repoPath }).toString();
        const remoteBranches = remoteBranchesOutput
          .split('\n')
          .map(b => b.trim().replace(/^origin\//, '')) // Remove 'origin/' prefix
          .filter(Boolean);
        
        // Check if the branch exists remotely
        if (remoteBranches.includes(branch)) {
          console.log(`Branch '${branch}' exists remotely but not locally.`);
          console.log(`To use this branch, run the following commands:`);
          console.log(`  cd ${repoPath}`);
          console.log(`  git fetch origin ${branch}:${branch}`);
          console.log(`  git checkout ${branch}`);
          console.log(`Then try running this tool again.`);
          
          throw new Error(`Branch '${branch}' exists remotely but not locally. Please fetch it first.`);
        }
        
        // If we're looking for 'gitorial' branch and README mentions it
        if (branch === 'gitorial') {
          try {
            const readmeContent = execSync('cat README.md', { cwd: repoPath }).toString();
            if (readmeContent.includes('gitorial branch') || readmeContent.includes('branch gitorial')) {
              console.log(`The README.md mentions a 'gitorial' branch, but it's not available locally or remotely.`);
              console.log(`This might be a gitorial repository that needs to be set up first.`);
              console.log(`Check the README.md for instructions on how to create or update the gitorial branch.`);
            }
          } catch (readmeError) {
            // README.md doesn't exist or can't be read, ignore
          }
        }
        
        // Branch doesn't exist remotely either
        console.error(`Branch '${branch}' does not exist locally or remotely.`);
        console.error('Available local branches:');
        localBranches.forEach(b => console.error(`  - ${b}`));
        
        // If 'master' branch exists and it's not the branch we were looking for, suggest using it
        if (localBranches.includes('master') && branch !== 'master') {
          console.error('\nTip: Try using the master branch instead:');
          console.error(`  gitorial-to-dotcodeschool -i ${repoPath} -o <output-path> -b master`);
        }
        
        throw new Error(`Branch '${branch}' not found. Please specify an existing branch using the -b option.`);
      } catch (remoteError) {
        // If we can't check remote branches, just report local branches
        console.error(`Branch '${branch}' does not exist locally.`);
        console.error('Available local branches:');
        localBranches.forEach(b => console.error(`  - ${b}`));
        
        // If 'master' branch exists and it's not the branch we were looking for, suggest using it
        if (localBranches.includes('master') && branch !== 'master') {
          console.error('\nTip: Try using the master branch instead:');
          console.error(`  gitorial-to-dotcodeschool -i ${repoPath} -o <output-path> -b master`);
        }
        
        throw new Error(`Branch '${branch}' not found. Please specify an existing branch using the -b option.`);
      }
    }
    
    console.log('Repository validation successful');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Repository path ${repoPath} does not exist`);
    }
    throw error;
  }
}

// Create the basic output directory structure for a Dot Code School course
async function createOutputStructure(outputPath) {
  console.log(`Creating Dot Code School course structure at ${outputPath}...`);
  
  // Create main directory if it doesn't exist
  try {
    await fs.mkdir(outputPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
  
  // Create sections directory
  await fs.mkdir(path.join(outputPath, 'sections'), { recursive: true });
  
  console.log('Basic directory structure created');
}

// Extract data from gitorial commits or steps directory
async function extractGitorialData(repoPath, branch) {
  console.log('Extracting data from gitorial repository...');
  
  // Check if there's a steps directory (for master branch in repositories like rust-state-machine)
  const hasStepsDir = await hasStepsDirectory(repoPath);
  
  // If we're on the master branch and there's a steps directory, use that instead of commits
  if (branch === 'master' && hasStepsDir) {
    console.log('Detected steps directory structure. Extracting data from steps...');
    return await extractDataFromSteps(repoPath);
  }
  
  // Otherwise, extract from commits as usual
  console.log('Extracting data from gitorial commits...');
  
  // Get all commits in the branch
  const gitLogOutput = execSync(
    `git log --reverse --format="%H %s" ${branch}`,
    { cwd: repoPath }
  ).toString();
  
  const commits = gitLogOutput.trim().split('\n').map(line => {
    const [hash, ...messageParts] = line.split(' ');
    const message = messageParts.join(' ');
    return { hash, message };
  });
  
  // First pass: identify all sections and template/solution pairs
  const sections = [];
  const templateCommits = [];
  const solutionCommits = [];
  const actionCommits = [];
  
  // Group commits by their prefix
  for (const commit of commits) {
    const { hash, message } = commit;
    
    // Skip the readme commit
    if (message.startsWith('readme:')) {
      continue;
    }
    
    if (message.startsWith('section:')) {
      const sectionTitle = message.substring('section:'.length).trim();
      const sectionSlug = slugify(sectionTitle);
      
      sections.push({
        title: sectionTitle,
        slug: sectionSlug,
        hash: hash,
        lessons: [],
        order: sections.length + 1
      });
    } else if (message.startsWith('template:')) {
      templateCommits.push({
        hash,
        message: message.substring('template:'.length).trim()
      });
    } else if (message.startsWith('solution:')) {
      solutionCommits.push({
        hash,
        message: message.substring('solution:'.length).trim()
      });
    } else if (message.startsWith('action:')) {
      actionCommits.push({
        hash,
        message: message.substring('action:'.length).trim(),
      });
    }
  }
  
  // If no sections were found, create a default section
  if (sections.length === 0) {
    sections.push({
      title: 'Getting Started',
      slug: 'getting-started',
      lessons: [],
      order: 1
    });
  }
  
  // Second pass: match template and solution commits
  const templateSolutionPairs = [];
  
  for (const template of templateCommits) {
    // Find matching solution
    const matchingSolution = solutionCommits.find(solution => 
      solution.message.trim() === template.message.trim()
    );
    
    if (matchingSolution) {
      templateSolutionPairs.push({
        title: template.message,
        slug: slugify(template.message),
        type: 'template-solution',
        templateHash: template.hash,
        solutionHash: matchingSolution.hash
      });
    } else {
      // No matching solution, treat as source
      templateSolutionPairs.push({
        title: template.message,
        slug: slugify(template.message),
        type: 'source',
        sourceHash: template.hash
      });
    }
  }
  
  // Add action commits as source lessons
  const sourceLessons = actionCommits.map(action => ({
    title: action.message,
    slug: slugify(action.message),
    type: 'source',
    sourceHash: action.hash
  }));
  
  // Combine template/solution pairs and source lessons
  const allLessons = [...templateSolutionPairs, ...sourceLessons];
  
  // Sort lessons by their commit order (assuming the array order matches commit order)
  allLessons.sort((a, b) => {
    const aIndex = commits.findIndex(c => c.hash === (a.templateHash || a.sourceHash));
    const bIndex = commits.findIndex(c => c.hash === (b.templateHash || b.sourceHash));
    return aIndex - bIndex;
  });
  
  // Distribute lessons across sections
  let currentSectionIndex = 0;
  
  for (const lesson of allLessons) {
    // Find the section this lesson belongs to
    // If we're at a section boundary, move to the next section
    const lessonCommitIndex = commits.findIndex(c => 
      c.hash === (lesson.templateHash || lesson.sourceHash)
    );
    
    // Check if there's a section that comes after the previous lesson but before this one
    for (let i = currentSectionIndex + 1; i < sections.length; i++) {
      const sectionCommitIndex = commits.findIndex(c => c.hash === sections[i].hash);
      if (sectionCommitIndex > -1 && sectionCommitIndex < lessonCommitIndex) {
        currentSectionIndex = i;
      }
    }
    
    // Add the lesson to the current section
    lesson.order = sections[currentSectionIndex].lessons.length + 1;
    sections[currentSectionIndex].lessons.push(lesson);
  }
  
  // If we didn't find any lessons with the expected prefixes, try to extract from steps directory
  if (allLessons.length === 0 && hasStepsDir) {
    console.log('No lessons found in commits. Trying to extract from steps directory...');
    return await extractDataFromSteps(repoPath);
  }
  
  // Extract content for each lesson
  for (const section of sections) {
    for (const lesson of section.lessons) {
      if (lesson.type === 'template-solution') {
        // Get template content
        lesson.templateContent = await getCommitContent(repoPath, lesson.templateHash);
        
        // Get solution content if available
        if (lesson.solutionHash) {
          lesson.solutionContent = await getCommitContent(repoPath, lesson.solutionHash);
        }
      } else if (lesson.type === 'source') {
        // Get source content
        lesson.sourceContent = await getCommitContent(repoPath, lesson.sourceHash);
      }
    }
  }
  
  return { sections };
}

// Check if the repository has a steps directory
async function hasStepsDirectory(repoPath) {
  try {
    await fs.access(path.join(repoPath, 'steps'));
    return true;
  } catch (error) {
    return false;
  }
}

// Extract data from steps directory structure
async function extractDataFromSteps(repoPath) {
  console.log('Extracting data from steps directory...');
  
  const stepsPath = path.join(repoPath, 'steps');
  
  // Get all step directories
  const stepDirs = await fs.readdir(stepsPath);
  
  // Sort step directories numerically
  const sortedStepDirs = stepDirs
    .filter(dir => !isNaN(parseInt(dir)))
    .sort((a, b) => parseInt(a) - parseInt(b));
  
  if (sortedStepDirs.length === 0) {
    throw new Error('No numbered step directories found in steps directory');
  }
  
  // First pass: identify all steps and their types
  const allSteps = [];
  
  for (const stepDir of sortedStepDirs) {
    const stepPath = path.join(stepsPath, stepDir);
    const stepStat = await fs.stat(stepPath);
    
    if (!stepStat.isDirectory()) {
      continue;
    }
    
    // Try to read metadata file if it exists
    let metadata = null;
    let commitMessage = '';
    try {
      const metadataPath = path.join(stepPath, 'gitorial_metadata.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      metadata = JSON.parse(metadataContent);
      commitMessage = metadata.commitMessage || '';
    } catch (error) {
      // No metadata file or invalid JSON, continue without it
    }
    
    // Try to read README file
    let readmeContent = '';
    try {
      const readmePath = path.join(stepPath, 'README.md');
      readmeContent = await fs.readFile(readmePath, 'utf8');
    } catch (error) {
      // No README file, continue without it
    }
    
    // Extract title from README if available
    let title = `Step ${stepDir}`;
    const titleMatch = readmeContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    // Determine step type based on commit message
    let stepType = 'unknown';
    if (commitMessage.startsWith('section:')) {
      stepType = 'section';
      // Title is already extracted from README H1
    } else if (commitMessage.startsWith('template:')) {
      stepType = 'template';
      // Title is already extracted from README H1
    } else if (commitMessage.startsWith('solution:')) {
      stepType = 'solution';
      // Title is already extracted from README H1
    } else if (commitMessage.startsWith('action:')) {
      stepType = 'action';
      // Title is already extracted from README H1
    }
    
    allSteps.push({
      dir: stepDir,
      path: stepPath,
      title,
      type: stepType,
      metadata,
      commitMessage,
      readmeContent,
      order: parseInt(stepDir)
    });
  }
  
  // Second pass: organize steps into sections and lessons
  const sections = [];
  
  // Find section steps
  const sectionSteps = allSteps.filter(step => step.type === 'section');
  
  // Create sections based on section steps
  for (const sectionStep of sectionSteps) {
    const section = {
      title: sectionStep.title,
      slug: slugify(sectionStep.title),
      lessons: [],
      order: sections.length + 1,
      stepOrder: sectionStep.order,
      readmeContent: sectionStep.readmeContent // Store the README content
    };
    sections.push(section);
  }
  
  // If no sections were found, throw an error
  if (sections.length === 0) {
    throw new Error('No sections found in the gitorial. The gitorial format must have at least one section commit with the prefix "section:"');
  }
  
  // Sort sections by their step order
  sections.sort((a, b) => a.stepOrder - b.stepOrder);
  
  // Group template and solution steps
  const templateSteps = allSteps.filter(step => step.type === 'template');
  const solutionSteps = allSteps.filter(step => step.type === 'solution');
  const actionSteps = allSteps.filter(step => step.type === 'action');
  
  // Match template and solution steps by title
  const templateSolutionPairs = [];
  
  for (const template of templateSteps) {
    // Find matching solution by title
    const matchingSolution = solutionSteps.find(solution => 
      solution.title.trim() === template.title.trim()
    );
    
    if (matchingSolution) {
      templateSolutionPairs.push({
        title: template.title,
        slug: slugify(template.title),
        type: 'template-solution',
        templateStep: template,
        solutionStep: matchingSolution,
        order: template.order
      });
    } else {
      // No matching solution, treat as source
      templateSolutionPairs.push({
        title: template.title,
        slug: slugify(template.title),
        type: 'source',
        sourceStep: template,
        order: template.order
      });
    }
  }
  
  // Add action steps as source lessons
  const sourceLessons = actionSteps.map(action => ({
    title: action.title,
    slug: slugify(action.title),
    type: 'source',
    sourceStep: action,
    order: action.order
  }));
  
  // Add any remaining steps that aren't categorized
  const categorizedStepDirs = new Set([
    ...sectionSteps.map(s => s.dir),
    ...templateSteps.map(s => s.dir),
    ...solutionSteps.map(s => s.dir),
    ...actionSteps.map(s => s.dir)
  ]);
  
  const uncategorizedSteps = allSteps.filter(step => !categorizedStepDirs.has(step.dir));
  
  const uncategorizedLessons = uncategorizedSteps.map(step => ({
    title: step.title,
    slug: slugify(step.title),
    type: 'source',
    sourceStep: step,
    order: step.order
  }));
  
  // Combine all lessons
  const allLessons = [
    ...templateSolutionPairs,
    ...sourceLessons,
    ...uncategorizedLessons
  ].sort((a, b) => a.order - b.order);
  
  // Distribute lessons across sections
  for (const lesson of allLessons) {
    // Find the section this lesson belongs to
    let sectionIndex = 0;
    
    // Find the last section that comes before this lesson
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].stepOrder < lesson.order) {
        sectionIndex = i;
      } else {
        break;
      }
    }
    
    // Add the lesson to the appropriate section
    lesson.order = sections[sectionIndex].lessons.length + 1;
    sections[sectionIndex].lessons.push(lesson);
  }
  
  // Extract content for each lesson
  for (const section of sections) {
    for (const lesson of section.lessons) {
      if (lesson.type === 'template-solution') {
        // Get template content
        lesson.templateContent = await getDirectoryContent(lesson.templateStep.path);
        
        // Get solution content if available
        if (lesson.solutionStep) {
          lesson.solutionContent = await getDirectoryContent(lesson.solutionStep.path);
        }
      } else if (lesson.type === 'source') {
        // Get source content
        lesson.sourceContent = await getDirectoryContent(lesson.sourceStep.path);
      }
    }
  }
  
  return { sections };
}

// Get the content of all files in a directory
async function getDirectoryContent(dirPath) {
  const content = {};
  
  // Helper function to recursively read files
  async function readFilesRecursively(dir, baseDir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (entry.isDirectory()) {
        await readFilesRecursively(fullPath, baseDir);
      } else {
        // Skip files we don't want to include
        if (
          entry.name.includes('gitorial_metadata.json') || 
          entry.name.includes('.gitattributes') ||
          entry.name === '.gitignore'
        ) {
          continue;
        }
        
        try {
          const fileContent = await fs.readFile(fullPath, 'utf8');
          content[relativePath] = fileContent;
        } catch (error) {
          console.warn(`Warning: Could not read file ${fullPath}`);
        }
      }
    }
  }
  
  await readFilesRecursively(dirPath, dirPath);
  return content;
}

// Get the content of a specific commit
async function getCommitContent(repoPath, commitHash) {
  console.log(`Extracting content from commit ${commitHash.substring(0, 8)}...`);
  
  // Get the list of files in the commit
  const filesOutput = execSync(
    `git ls-tree -r --name-only ${commitHash}`,
    { cwd: repoPath }
  ).toString();
  
  const files = filesOutput.trim().split('\n').filter(file => 
    // Filter out files we don't want to include
    !file.includes('gitorial_metadata.json') && 
    !file.includes('.gitattributes') &&
    file !== '.gitignore'
  );
  
  // Get the content of each file
  const content = {};
  
  for (const file of files) {
    try {
      const fileContent = execSync(
        `git show ${commitHash}:${file}`,
        { cwd: repoPath }
      ).toString();
      
      content[file] = fileContent;
    } catch (error) {
      console.warn(`Warning: Could not extract content for file ${file} in commit ${commitHash}`);
    }
  }
  
  return content;
}

// Generate the Dot Code School course structure
async function generateDotCodeSchoolCourse(gitorialData, options) {
  console.log('Generating Dot Code School course structure...');
  
  const { sections } = gitorialData;
  const outputPath = options.output;
  const courseSlug = path.basename(outputPath);
  
  // 1. Create course metadata file
  await createCourseMetadataFile(outputPath, courseSlug, options, sections);
  
  // 2. Create sections and lessons
  for (const section of sections) {
    await createSection(outputPath, section);
  }
  
  console.log('Dot Code School course structure generated');
}

// Create the course metadata file
async function createCourseMetadataFile(outputPath, courseSlug, options, sections) {
  console.log('Creating course metadata file...');
  
  const courseTitle = options.title || courseSlug;
  const courseAuthor = options.author || 'Course Author';
  const courseDescription = options.description || `A course converted from gitorial format.`;
  const courseLevel = options.level || 'Beginner';
  const courseLanguage = options.language || 'Unknown';
  
  // Generate what you'll learn from section titles
  const whatYoullLearn = sections.map(section => section.title);
  
  const courseContent = `---
slug: ${courseSlug}
title: ${courseTitle}
author: ${courseAuthor}
author_url: https://github.com/${courseAuthor.toLowerCase().replace(/\s+/g, '')}
description: ${courseDescription}
level: ${courseLevel}
language: ${courseLanguage}
tags: ["${courseLanguage.toLowerCase()}", "tutorial", "course"]
prerequisites: []
what_youll_learn: ${JSON.stringify(whatYoullLearn, null, 2)}
estimated_time: ${Math.ceil(sections.length / 2)} # Estimated time to complete in hours
last_updated: "${new Date().toISOString().split('T')[0]}" # Current date
---

# ${courseTitle}

${courseDescription}

## Course Outline

${sections.map(section => `- ${section.title}`).join('\n')}
`;

  await fs.writeFile(path.join(outputPath, `${courseSlug}.mdx`), courseContent);
  console.log('Course metadata file created');
}

// Create a section with its lessons
async function createSection(outputPath, section) {
  console.log(`Creating section: ${section.title}...`);
  
  const sectionPath = path.join(outputPath, 'sections', section.slug);
  const lessonsPath = path.join(sectionPath, 'lessons');
  
  // Create section directory
  await fs.mkdir(sectionPath, { recursive: true });
  
  // Create lessons directory
  await fs.mkdir(lessonsPath, { recursive: true });
  
  // Create section metadata file
  // Extract section content from README if available
  let sectionDescription = section.title;
  let sectionContent = '';
  
  if (section.readmeContent) {
    // Remove the first heading (H1) from the README content
    const readmeWithoutH1 = section.readmeContent.replace(/^#\s+.*\n/, '').trim();
    if (readmeWithoutH1) {
      sectionContent = readmeWithoutH1;
    }
  }
  
  const sectionMdx = `---
slug: ${section.slug}
title: ${section.title}
order: ${section.order || 1}
description: ${sectionDescription}
---

${sectionContent || `This section covers ${section.title.toLowerCase()}.`}
`;

  await fs.writeFile(path.join(sectionPath, `${section.slug}.mdx`), sectionMdx);
  
  // Create lessons
  for (const lesson of section.lessons) {
    await createLesson(lessonsPath, lesson);
  }
  
  console.log(`Section ${section.title} created`);
}

// Create a lesson with its files
async function createLesson(lessonsPath, lesson) {
  console.log(`Creating lesson: ${lesson.title}...`);
  
  const lessonPath = path.join(lessonsPath, lesson.slug);
  const filesPath = path.join(lessonPath, 'files');
  
  // Create lesson directory
  await fs.mkdir(lessonPath, { recursive: true });
  
  // Create lesson metadata file
  const lessonContent = `---
slug: ${lesson.slug}
title: ${lesson.title}
order: ${lesson.order || 1}
last_updated: "${new Date().toISOString().split('T')[0]}" # Current date
---

# ${lesson.title}

${extractLessonContent(lesson)}
`;

  await fs.writeFile(path.join(lessonPath, `${lesson.slug}.mdx`), lessonContent);
  
  // Create files directory if needed
  if (lesson.type === 'template-solution' || lesson.type === 'source') {
    await fs.mkdir(filesPath, { recursive: true });
    
    if (lesson.type === 'template-solution') {
      // Create template and solution directories
      const templatePath = path.join(filesPath, 'template');
      const solutionPath = path.join(filesPath, 'solution');
      
      await fs.mkdir(templatePath, { recursive: true });
      await fs.mkdir(solutionPath, { recursive: true });
      
      // Write template files
      if (lesson.templateContent) {
        await writeFiles(templatePath, lesson.templateContent);
      }
      
      // Write solution files
      if (lesson.solutionContent) {
        await writeFiles(solutionPath, lesson.solutionContent);
      }
    } else if (lesson.type === 'source') {
      // Create source directory
      const sourcePath = path.join(filesPath, 'source');
      await fs.mkdir(sourcePath, { recursive: true });
      
      // Write source files
      if (lesson.sourceContent) {
        await writeFiles(sourcePath, lesson.sourceContent);
      }
    }
  }
  
  console.log(`Lesson ${lesson.title} created`);
}

// Write files to the specified directory
async function writeFiles(dirPath, files) {
  for (const [filePath, content] of Object.entries(files)) {
    // Skip README.md as we've already extracted its content
    if (path.basename(filePath) === 'README.md') {
      continue;
    }
    
    // Create subdirectories if needed
    const fullPath = path.join(dirPath, filePath);
    const fileDir = path.dirname(fullPath);
    
    await fs.mkdir(fileDir, { recursive: true });
    
    // Write file content
    await fs.writeFile(fullPath, content);
  }
}

// Extract lesson content from README.md
function extractLessonContent(lesson) {
  let readmeContent = '';
  
  if (lesson.type === 'template-solution' && lesson.templateContent && lesson.templateContent['README.md']) {
    readmeContent = lesson.templateContent['README.md'];
  } else if (lesson.type === 'source' && lesson.sourceContent && lesson.sourceContent['README.md']) {
    readmeContent = lesson.sourceContent['README.md'];
  }
  
  // Remove the first heading if it exists (it's usually just the title)
  readmeContent = readmeContent.replace(/^#\s+.*\n/, '');
  
  return readmeContent.trim();
}

// Run the conversion
convertGitorialToDotCodeSchool();
