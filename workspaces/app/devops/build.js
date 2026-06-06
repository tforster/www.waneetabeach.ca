import Gilbert from "@tforster/gilbert";
import GilbertFS from "@tforster/gilbert-fs";
import GilbertFile from "@tforster/gilbert-file";
import { marked } from "marked";

// Configure marked — GFM, no header IDs (we control heading markup)
marked.setOptions({ gfm: true, breaks: false, headerIds: false, mangle: false });

// Fields in CMS JSON files that contain Markdown and should be rendered to HTML
const MARKDOWN_FIELDS = ["history", "geographyProse", "environment", "sources", "ctaText"];

/**
 * Gilbert middleware: converts named Markdown string fields to HTML in-place.
 * Only processes files that contain at least one of the target fields.
 */
const markdownMiddleware = async (dataFiles) => {
  const processed = [];

  for (const file of dataFiles) {
    const raw = await file.toString();
    const data = JSON.parse(raw);

    const hasMarkdown = MARKDOWN_FIELDS.some((f) => typeof data[f] === "string");

    if (!hasMarkdown) {
      processed.push(file);
      continue;
    }

    for (const field of MARKDOWN_FIELDS) {
      if (typeof data[field] === "string") {
        data[field] = marked.parse(data[field]);
      }
    }

    const modifiedFile = new GilbertFile({
      path: file.path,
      contents: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(data, null, 2)));
          controller.close();
        },
      }),
    });

    processed.push(modifiedFile);
  }

  return processed;
};

// Local dashboard sources
const dataAdapter = new GilbertFS({ base: "./src/cms" });
const templatesAdapter = new GilbertFS({ base: "./src/templates" });

const gilbert = new Gilbert({
  data: {
    source: dataAdapter.read("**/*.json"),
    middleware: [markdownMiddleware],
  },
  templates: [templatesAdapter.read("**/*.hbs")],
  staticFiles: [new GilbertFS({ base: "./src/" }).read("files/**/*"), new GilbertFS({ base: "./src/" }).read("manifest.json")],
  scripts: [
    `./src/scripts/main.js`,
    `./src/scripts/login.js`,
    `./src/scripts/forum.js`,
    `./src/scripts/forgot-password.js`,
    `./src/scripts/reset-password.js`,
  ],
  stylesheets: [`./src/stylesheets/main.css`],
});

const stream = await gilbert.compile();
await stream.pipeTo(new GilbertFS({ base: "./dist" }).write("./dist"));
