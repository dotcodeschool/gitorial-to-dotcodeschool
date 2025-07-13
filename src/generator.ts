import { promises as fs } from "fs";
import * as path from "path";
import {
  GitorialData,
  Section,
  Lesson,
  CliOptions,
  LessonContent,
} from "./types";

// Generate the Dot Code School course structure
export async function generateDotCodeSchoolCourse(
  gitorialData: GitorialData,
  options: CliOptions,
  githubUrl: string
): Promise<void> {
  console.log("Generating Dot Code School course structure...");

  const { sections } = gitorialData;
  const outputPath = options.output;
  const courseSlug = path.basename(outputPath);

  // 1. Create course metadata file
  await createCourseMetadataFile(
    outputPath,
    courseSlug,
    options,
    sections,
    githubUrl
  );

  // 2. Create sections and lessons
  for (const section of sections) {
    await createSection(outputPath, section);
  }

  console.log("Dot Code School course structure generated");
}

// Create the course metadata file
async function createCourseMetadataFile(
  outputPath: string,
  courseSlug: string,
  options: CliOptions,
  sections: Section[],
  githubUrl: string
): Promise<void> {
  console.log("Creating course metadata file...");

  const courseTitle = options.title || courseSlug;
  const courseAuthor = options.author || "Course Author";
  const courseDescription =
    options.description || `A course converted from gitorial format.`;
  const courseLevel = options.level || "Beginner";
  const courseLanguage = options.language || "Unknown";

  // Generate what you'll learn from section titles
  const whatYoullLearn = sections.map((section) => section.title);

  const courseContent = `---
slug: ${courseSlug}
title: ${courseTitle}
author: ${courseAuthor}
author_url: https://github.com/${courseAuthor.toLowerCase().replace(/\s+/g, "")}
description: ${courseDescription}
level: ${courseLevel}
language: ${courseLanguage}
tags: ["${courseLanguage.toLowerCase()}", "tutorial", "course"]
prerequisites: []
what_youll_learn: ${JSON.stringify(whatYoullLearn, null, 2)}
estimated_time: ${Math.ceil(
    sections.length / 2
  )} # Estimated time to complete in hours
last_updated: "${new Date().toISOString().split("T")[0]}" # Current date
is_gitorial: true
github_url: ${githubUrl} # Original gitorial repository URL
---

# ${courseTitle}

${courseDescription}

## Course Outline

${sections.map((section) => `- ${section.title}`).join("\n")}
`;

  await fs.writeFile(path.join(outputPath, `${courseSlug}.mdx`), courseContent);
  console.log("Course metadata file created");
}

// Create a section with its lessons
async function createSection(
  outputPath: string,
  section: Section
): Promise<void> {
  console.log(`Creating section: ${section.title}...`);

  const sectionPath = path.join(outputPath, "sections", section.slug);
  const lessonsPath = path.join(sectionPath, "lessons");

  // Create section directory
  await fs.mkdir(sectionPath, { recursive: true });

  // Create lessons directory
  await fs.mkdir(lessonsPath, { recursive: true });

  // Create section metadata file
  const sectionMdx = `---
slug: ${section.slug}
title: "${section.title}"
order: ${section.order || 1}
description: "${section.title}"
---

${section.readmeContent || ""}
`;

  await fs.writeFile(path.join(sectionPath, `${section.slug}.mdx`), sectionMdx);

  // Create lessons
  for (const lesson of section.lessons) {
    await createLesson(lessonsPath, lesson);
  }

  console.log(`Section ${section.title} created`);
}

// Create a lesson with its files
async function createLesson(
  lessonsPath: string,
  lesson: Lesson
): Promise<void> {
  console.log(`Creating lesson: ${lesson.title}...`);

  const lessonPath = path.join(lessonsPath, lesson.slug);
  const filesPath = path.join(lessonPath, "files");

  // Create lesson directory
  await fs.mkdir(lessonPath, { recursive: true });

  // Create lesson metadata file
  const lessonContent = `---
slug: ${lesson.slug}
title: ${lesson.title}
order: ${lesson.order || 1}
last_updated: "${new Date().toISOString().split("T")[0]}" # Current date
commit_hash: ${lesson.commitHash}
---

# ${lesson.title}

${extractLessonContent(lesson)}
`;

  await fs.writeFile(
    path.join(lessonPath, `${lesson.slug}.mdx`),
    lessonContent
  );

  // Create files directory if needed
  if (lesson.type === "template-solution" || lesson.type === "source") {
    await fs.mkdir(filesPath, { recursive: true });

    if (lesson.type === "template-solution") {
      // Create template and solution directories
      const templatePath = path.join(filesPath, "template");
      const solutionPath = path.join(filesPath, "solution");

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
    } else if (lesson.type === "source") {
      // Create source directory
      const sourcePath = path.join(filesPath, "source");
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
async function writeFiles(
  dirPath: string,
  files: LessonContent
): Promise<void> {
  for (const [filePath, content] of Object.entries(files)) {
    // Skip README.md as we've already extracted its content
    if (path.basename(filePath) === "README.md") {
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
function extractLessonContent(lesson: Lesson): string {
  let readmeContent = "";

  if (
    lesson.type === "template-solution" &&
    lesson.templateContent &&
    lesson.templateContent["README.md"]
  ) {
    readmeContent = lesson.templateContent["README.md"];
  } else if (
    lesson.type === "source" &&
    lesson.sourceContent &&
    lesson.sourceContent["README.md"]
  ) {
    readmeContent = lesson.sourceContent["README.md"];
  }

  // Remove the first heading if it exists (it's usually just the title)
  readmeContent = readmeContent.replace(/^#\s+.*\n/, "");

  return readmeContent.trim();
}
