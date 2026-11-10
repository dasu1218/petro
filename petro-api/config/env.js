import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Resolve relative to this module, not the terminal's working directory.
// Deployment-provided environment variables retain precedence.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
