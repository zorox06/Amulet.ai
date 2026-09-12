import path from 'node:path';
import dotenv from 'dotenv';
import { CoreLoop } from './services/pipeline/core_loop.js';
import { Vendor } from './services/detector/exa_detector.js';

dotenv.config();
const vendor = (process.argv[2] || 'stripe') as Vendor;
const repoDir = path.resolve(process.argv[3] || process.cwd());
new CoreLoop().run({ vendor, repoDir, liveSearch: process.env.EXA_LIVE !== 'false', openPr: process.env.OPEN_PR === 'true' })
  .then((run) => console.log(JSON.stringify(run, null, 2)))
  .catch((error) => { console.error(error.message); process.exitCode = 1; });
