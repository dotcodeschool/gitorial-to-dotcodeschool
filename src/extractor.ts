import { promises as fs } from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { slugify } from './utils';
import {
  GitorialData,
  Section,
  Lesson,
  TemplateSolutionLesson,
  SourceLesson,
  GitCommit,
  TemplateCommit,
  SolutionCommit,
  ActionCommit,
  Step,
  StepMetadata,
  LessonContent
} from './types';

// Extract data from gitorial commits or steps directory
export async function extractGitorialData(repoPath: string, branch: string): Promise<GitorialData> {
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
  
  const commits: GitCommit[] = gitLogOutput.trim().split('\n').map(line => {
    const [hash, ...messageParts] = line.split(' ');
    const message = messageParts.join(' ');
    return { hash, message };
  });
  
  // First pass: identify all sections and template/solution pairs
  const sections: Section[] = [];
  const templateCommits: TemplateCommit[] = [];
  const solutionCommits: SolutionCommit[] = [];
  const actionCommits: ActionCommit[] = [];
  
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
  const templateSolutionPairs: TemplateSolutionLesson[] = [];
  
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
        solutionHash: matchingSolution.hash,
        commitHash: template.hash, // Use template hash as primary source
        order: 0 // Will be set later
      });
    } else {
      // No matching solution, treat as source
      templateSolutionPairs.push({
        title: template.message,
        slug: slugify(template.message),
        type: 'template-solution',
        templateHash: template.hash,
        commitHash: template.hash, // Use template hash as primary source
        order: 0 // Will be set later
      });
    }
  }
  
  // Add action commits as source lessons
  const sourceLessons: SourceLesson[] = actionCommits.map(action => ({
    title: action.message,
    slug: slugify(action.message),
    type: 'source',
    sourceHash: action.hash,
    commitHash: action.hash, // Use action hash as primary source
    order: 0 // Will be set later
  }));
  
  // Combine template/solution pairs and source lessons
  const allLessons: Lesson[] = [...templateSolutionPairs, ...sourceLessons];
  
  // Sort lessons by their commit order (assuming the array order matches commit order)
  allLessons.sort((a, b) => {
    const aHash = a.type === 'template-solution' ? a.templateHash : a.sourceHash;
    const bHash = b.type === 'template-solution' ? b.templateHash : b.sourceHash;
    const aIndex = commits.findIndex(c => c.hash === aHash);
    const bIndex = commits.findIndex(c => c.hash === bHash);
    return aIndex - bIndex;
  });
  
  // Distribute lessons across sections
  let currentSectionIndex = 0;
  
  for (const lesson of allLessons) {
    // Find the section this lesson belongs to
    // If we're at a section boundary, move to the next section
    const lessonHash = lesson.type === 'template-solution' ? lesson.templateHash : lesson.sourceHash;
    const lessonCommitIndex = commits.findIndex(c => c.hash === lessonHash);
    
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
        if (lesson.templateHash) {
          lesson.templateContent = await getCommitContent(repoPath, lesson.templateHash);
        }
        
        // Get solution content if available
        if (lesson.solutionHash) {
          lesson.solutionContent = await getCommitContent(repoPath, lesson.solutionHash);
        }
      } else if (lesson.type === 'source' && lesson.sourceHash) {
        // Get source content
        lesson.sourceContent = await getCommitContent(repoPath, lesson.sourceHash);
      }
    }
  }
  
  return { sections };
}

// Check if the repository has a steps directory
async function hasStepsDirectory(repoPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(repoPath, 'steps'));
    return true;
  } catch (error) {
    return false;
  }
}

// Extract data from steps directory structure
async function extractDataFromSteps(repoPath: string): Promise<GitorialData> {
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
  const allSteps: Step[] = [];
  
  for (const stepDir of sortedStepDirs) {
    const stepPath = path.join(stepsPath, stepDir);
    const stepStat = await fs.stat(stepPath);
    
    if (!stepStat.isDirectory()) {
      continue;
    }
    
    // Try to read metadata file if it exists
    let metadata: StepMetadata | null = null;
    let commitMessage = '';
    try {
      const metadataPath = path.join(stepPath, 'gitorial_metadata.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      metadata = JSON.parse(metadataContent) as StepMetadata;
      commitMessage = metadata.commitMessage || '';
    } catch (error) {
      throw new Error("No metadata file or invalid JSON, continuing without it");
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
    let stepType: Step['type'] = 'unknown';
    if (commitMessage.startsWith('section:')) {
      stepType = 'section';
    } else if (commitMessage.startsWith('template:')) {
      stepType = 'template';
    } else if (commitMessage.startsWith('solution:')) {
      stepType = 'solution';
    } else if (commitMessage.startsWith('action:')) {
      stepType = 'action';
    }
    
    allSteps.push({
      dir: stepDir,
      path: stepPath,
      title,
      type: stepType,
      metadata: {
        commitHash: metadata?.commitHash || '', //FIX: quick and dirty
        commitMessage: metadata?.commitMessage || ''
      },
      commitMessage,
      readmeContent,
      order: parseInt(stepDir)
    });
  }
  
  // Second pass: organize steps into sections and lessons
  const sections: Section[] = [];
  
  // Find section steps
  const sectionSteps = allSteps.filter(step => step.type === 'section');
  
  // Create sections based on section steps
  for (const sectionStep of sectionSteps) {
    const section: Section = {
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
  sections.sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));
  
  // Group template and solution steps
  const templateSteps = allSteps.filter(step => step.type === 'template');
  const solutionSteps = allSteps.filter(step => step.type === 'solution');
  const actionSteps = allSteps.filter(step => step.type === 'action');
  
  // Match template and solution steps by step number sequence
  const templateSolutionPairs: TemplateSolutionLesson[] = [];
  
  for (const template of templateSteps) {
    // Find matching solution by step number (solution should be template step number + 1)
    const templateStepNumber = parseInt(template.dir);
    const matchingSolution = solutionSteps.find(solution => 
      parseInt(solution.dir) === templateStepNumber + 1
    );
    
    if (matchingSolution) {
      templateSolutionPairs.push({
        title: template.title,
        slug: slugify(template.title),
        type: 'template-solution',
        templateStep: template,
        solutionStep: matchingSolution,
        commitHash: extractCommitHashFromStep(template), // Extract from metadata if available
        order: template.order
      });
    } else {
      // No matching solution, treat as source
      templateSolutionPairs.push({
        title: template.title,
        slug: slugify(template.title),
        type: 'template-solution',
        templateStep: template,
        commitHash: extractCommitHashFromStep(template), // Extract from metadata if available
        order: template.order
      });
    }
  }
  
  // Add action steps as source lessons
  const sourceLessons: SourceLesson[] = actionSteps.map(action => ({
    title: action.title,
    slug: slugify(action.title),
    type: 'source',
    sourceStep: action,
    commitHash: extractCommitHashFromStep(action), // Extract from metadata if available
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
  
  const uncategorizedLessons: SourceLesson[] = uncategorizedSteps.map(step => ({
    title: step.title,
    slug: slugify(step.title),
    type: 'source',
    sourceStep: step,
    commitHash: extractCommitHashFromStep(step), // Extract from metadata if available
    order: step.order
  }));
  
  // Combine all lessons
  const allLessons: Lesson[] = [
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
      if ((sections[i].stepOrder || 0) < lesson.order) {
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
        if (lesson.templateStep) {
          lesson.templateContent = await getDirectoryContent(lesson.templateStep.path);
        }
        
        // Get solution content if available
        if (lesson.solutionStep) {
          lesson.solutionContent = await getDirectoryContent(lesson.solutionStep.path);
        }
      } else if (lesson.type === 'source' && lesson.sourceStep) {
        // Get source content
        lesson.sourceContent = await getDirectoryContent(lesson.sourceStep.path);
      }
    }
  }
  
  return { sections };
}

// Get the content of all files in a directory
async function getDirectoryContent(dirPath: string): Promise<LessonContent> {
  const content: LessonContent = {};
  
  // Helper function to recursively read files
  async function readFilesRecursively(dir: string, baseDir: string): Promise<void> {
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
          entry.name.includes('.gitattributes')
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

// Extract commit hash from step metadata if available
function extractCommitHashFromStep(step: Step): string {
  return step.metadata.commitHash;
}

// Get the content of a specific commit
async function getCommitContent(repoPath: string, commitHash: string): Promise<LessonContent> {
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
  const content: LessonContent = {};
  
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