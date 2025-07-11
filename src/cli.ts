#!/usr/bin/env node

import { program } from 'commander';
import { convertGitorialToDotCodeSchool } from './converter';
import { CliOptions } from './types';

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

const options = program.opts() as CliOptions;

// Run the conversion
convertGitorialToDotCodeSchool(options)
  .then(() => {
    console.log('Conversion completed successfully!');
  })
  .catch((error: Error) => {
    console.error('Error during conversion:', error);
    process.exit(1);
  }); 