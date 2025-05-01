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

/**
 * Finds the absolute path of a command using the `which` command. Can be used to check if a binary is available in the system's PATH.
 * @param cmd - The command to find.
 * @returns The path to the command if found, otherwise null.
 */
export async function which(cmd: string): Promise<string | null> {
    const proc = Bun.spawn(['which', cmd], {
        stdout: 'pipe',
        stderr: 'ignore'
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    return exitCode === 0 ? output.trim() : null;
}

export async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}