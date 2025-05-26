// Command line options interface
export interface CliOptions {
  input: string;
  output: string;
  branch: string;
  title?: string;
  author?: string;
  description?: string;
  level?: string;
  language?: string;
}

// Git commit interface
export interface GitCommit {
  hash: string;
  message: string;
}

// Lesson content interface
export interface LessonContent {
  [filePath: string]: string;
}

// Base lesson interface
export interface BaseLesson {
  title: string;
  slug: string;
  order: number;
  commitHash: string; // The primary commit hash for this lesson
}

// Template-solution lesson interface
export interface TemplateSolutionLesson extends BaseLesson {
  type: 'template-solution';
  templateHash?: string;
  solutionHash?: string;
  templateContent?: LessonContent;
  solutionContent?: LessonContent;
  templateStep?: Step;
  solutionStep?: Step;
}

// Source lesson interface
export interface SourceLesson extends BaseLesson {
  type: 'source';
  sourceHash?: string;
  sourceContent?: LessonContent;
  sourceStep?: Step;
}

// Union type for all lesson types
export type Lesson = TemplateSolutionLesson | SourceLesson;

// Section interface
export interface Section {
  title: string;
  slug: string;
  lessons: Lesson[];
  order: number;
  hash?: string;
  stepOrder?: number;
  readmeContent?: string;
}

// Step metadata interface
export interface StepMetadata {
  commitMessage: string;
  commitHash: string;
  [key: string]: any;
}

// Step interface (for steps directory structure)
export interface Step {
  dir: string;
  path: string;
  title: string;
  type: 'section' | 'template' | 'solution' | 'action' | 'unknown';
  metadata: StepMetadata;
  commitMessage: string;
  readmeContent: string;
  order: number;
}

// Gitorial data interface
export interface GitorialData {
  sections: Section[];
}

// Template commit interface
export interface TemplateCommit {
  hash: string;
  message: string;
}

// Solution commit interface
export interface SolutionCommit {
  hash: string;
  message: string;
}

// Action commit interface
export interface ActionCommit {
  hash: string;
  message: string;
} 