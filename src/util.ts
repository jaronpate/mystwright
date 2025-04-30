import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * Writes data to a file path relative to the calling module.
 * @param relativePath - Path relative to the current script file.
 * @param data - The data to write (string, ArrayBuffer, or Blob).
 */
export async function writeRelative(relativePath: string, data: string | ArrayBuffer | Blob) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const fullPath = join(__dirname, relativePath);
    await Bun.write(fullPath, data);
}