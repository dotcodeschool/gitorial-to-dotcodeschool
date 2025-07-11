import { promises as fs } from 'fs';
import * as path from 'path';
import { validateGitorialRepo, extractGitHubUrl } from './validator';
import { extractGitorialData } from './extractor';
import { generateDotCodeSchoolCourse } from './generator';
import { CliOptions } from './types';

// Main function to convert gitorial to Dot Code School format
export async function convertGitorialToDotCodeSchool(options: CliOptions): Promise<void> {
  try {
    console.log('Starting conversion from gitorial to Dot Code School format...');
    
    // 1. Validate input repository
    await validateGitorialRepo(options.input, options.branch);
    
    // 2. Extract GitHub URL from repository
    const githubUrl = extractGitHubUrl(options.input);
    console.log(`Detected GitHub URL: ${githubUrl}`);
    
    // 3. Create output directory structure
    await createOutputStructure(options.output);
    
    // 4. Extract gitorial metadata and content
    const gitorialData = await extractGitorialData(options.input, options.branch);
    
    // 5. Generate Dot Code School course structure
    await generateDotCodeSchoolCourse(gitorialData, options, githubUrl);
    
    console.log('Conversion completed successfully!');
  } catch (error) {
    console.error('Error during conversion:', error);
    throw error;
  }
}

// Create the basic output directory structure for a Dot Code School course
async function createOutputStructure(outputPath: string): Promise<void> {
  console.log(`Creating Dot Code School course structure at ${outputPath}...`);
  
  // Create main directory if it doesn't exist
  try {
    await fs.mkdir(outputPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
  
  // Create sections directory
  await fs.mkdir(path.join(outputPath, 'sections'), { recursive: true });
  
  console.log('Basic directory structure created');
} 