import { downloadDemo } from "./download.js";
import { parseDemo } from "./parser.js";
// CPU/native parser work is isolated from the API's event loop and DB credentials.
process.once("message", async (job: { url: string; directory: string }) => {
  try {
    const path = await downloadDemo(job.url, job.directory);
    const result = parseDemo(path);
    process.send?.({ ok: true, result }, () => process.disconnect());
  } catch {
    // Do not expose file paths, demo URLs or native error details to API clients.
    process.send?.({ ok: false }, () => process.disconnect());
  }
});
