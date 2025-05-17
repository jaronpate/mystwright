import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * Writes data to a file path relative to the calling module.
 * @param relativePath - Path relative to the current script file.
 * @param data - The data to write (string, ArrayBuffer, or Blob).
 */
export async function writeRelative(callerUrl: string, relativePath: string, data: string | Buffer | ArrayBuffer | Blob): Promise<number> {
    const __filename = fileURLToPath(callerUrl);
    const __dirname = dirname(__filename);
    const fullPath = join(__dirname, relativePath);
    if (Bun !== null && Bun !== undefined) {
        return await Bun.write(fullPath, data);
    } else {
        const { writeFile } = await import('fs/promises');
        
        // Convert data to compatible type for Node.js writeFile
        if (data instanceof ArrayBuffer) {
            await writeFile(fullPath, Buffer.from(data));
            return data.byteLength;
        } else if (data instanceof Blob) {
            const arrayBuffer = await data.arrayBuffer();
            await writeFile(fullPath, Buffer.from(arrayBuffer));
            return arrayBuffer.byteLength;
        } else {
            // For string or Buffer, we can use directly
            await writeFile(fullPath, data);
            return typeof data === 'string' ? Buffer.byteLength(data) : data.length;
        }
    }
}

/**
 * Finds the absolute path of a command using the `which` command. Can be used to check if a binary is available in the system's PATH.
 * @param cmd - The command to find.
 * @returns The path to the command if found, otherwise null.
 */
export async function which(cmd: string): Promise<string | null> {
    if (Bun !== null && Bun !== undefined) {
        return Bun.which(cmd);
        
        // const proc = Bun.spawn(['which', cmd], {
        //     stdout: 'pipe',
        //     stderr: 'ignore'
        // });

        // const output = await new Response(proc.stdout).text();
        // const exitCode = await proc.exited;

        // return exitCode === 0 ? output.trim() : null;
    } else {
        const { spawn } = await import('child_process');

        const proc = spawn('which', [cmd], {
            shell: true,
            stdio: ['ignore', 'pipe', 'ignore']
        });

        return new Promise((resolve) => {
            proc.stdout.on('data', (data) => {
                resolve(data.toString().trim());
            });

            proc.on('close', (code) => {
                if (code !== 0) {
                    resolve(null);
                }
            });
        });
    }

}

export async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}