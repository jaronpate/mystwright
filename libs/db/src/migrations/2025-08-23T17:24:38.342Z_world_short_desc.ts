import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>) {
    await db.schema
        .alterTable('worlds')
        // default to the value of description for existing rows so that it can be not null
        .addColumn('short_description', 'text', (col) =>
            col
                .notNull()
                .defaultTo('No short description.')
        )
        .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema
        .alterTable('worlds')
        .dropColumn('short_description')
        .execute();
}
