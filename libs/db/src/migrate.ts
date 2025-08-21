import { FileMigrationProvider, Kysely, Migrator } from 'kysely';
import { promises as fs } from 'node:fs';
import path from 'path';

export async function migrateToLatest(db: Kysely<any>) {
    const migrator = new Migrator({
        db,
        provider: new FileMigrationProvider({
            fs,
            path,
            migrationFolder: path.join(__dirname, 'migrations'),
        }),
        migrationTableName: 'migration',
        migrationLockTableName: 'lock',
        migrationTableSchema: 'infra',
    });

    const { error, results } = await migrator.migrateToLatest();

    
    results?.forEach(r => {
        if (r.status === 'Error') {
            console.log(`Migration failed: ${r.migrationName}`);
        } else if (r.status === 'Success') {
            console.log(`Migration succeeded: ${r.migrationName}`);
        } else if (r.status === 'NotExecuted') {
            console.log(`Migration skipped: ${r.migrationName}`);
        } else {
            console.log(`Migration status unknown: ${r.migrationName}`);
        }
    });

    if (error) {
        console.log(`Migration failed`, error);
        throw error;
    }
}
