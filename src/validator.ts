import { promises as fs } from 'fs';
import { execSync } from 'child_process';

// Validate that the input is a git repository with the specified branch
export async function validateGitorialRepo(repoPath: string, branch: string): Promise<void> {
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
    try {
      execSync(`git show-ref --verify --quiet refs/heads/${branch}`, { 
        cwd: repoPath 
      });
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
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Repository path ${repoPath} does not exist`);
    }
    throw error;
  }
} 