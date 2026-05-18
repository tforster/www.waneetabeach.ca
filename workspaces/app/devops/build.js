import Gilbert from "@tforster/gilbert";
import GilbertFS from "@tforster/gilbert-fs";

// Local dashboard sources
const dataAdapter = new GilbertFS({ base: "./src/cms" });
const templatesAdapter = new GilbertFS({ base: "./src/templates" });

const gilbert = new Gilbert({
  data: {
    source: dataAdapter.read("**/*.json"),
  },
  templates: [templatesAdapter.read("**/*.hbs")],
  staticFiles: [
    new GilbertFS({ base: "./src/" }).read("files/**/*"),
    new GilbertFS({ base: "./src/" }).read("manifest.json"),
  ],
  scripts: [`./src/scripts/main.js`, `./src/scripts/login.js`, `./src/scripts/forum.js`],
  stylesheets: [`./src/stylesheets/main.css`],
});

const stream = await gilbert.compile();
await stream.pipeTo(new GilbertFS({ base: "./dist" }).write("./dist"));
