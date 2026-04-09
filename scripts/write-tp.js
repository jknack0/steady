const fs = require("fs");
const content = fs.readFileSync("c:/Dev/steady/scripts/tp-content.txt", "utf8");
fs.writeFileSync("c:/Dev/steady/docs/test-plans/gpu-transcription-pipeline.md", content);
console.log("Written", content.length, "chars");