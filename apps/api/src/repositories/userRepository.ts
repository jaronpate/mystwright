import { db, type NewUser, type SafeUser, type User, type UserUpdate } from '../db';

export const userRepository = {
    /**
     * Find a user by email
     */
    async findByEmail(email: string): Promise<User | undefined> {
        return await db
            .selectFrom('users')
            .where('email', '=', email)
            .selectAll()
            .executeTakeFirst();
    },

    /**
     * Find a user by ID
     */
    async findById(id: string): Promise<User | undefined> {
        return await db
            .selectFrom('users')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();
    },

    /**
     * Create a new user
     */
    async create(user: NewUser): Promise<SafeUser> {
        return await db
            .insertInto('users')
            .values(user)
            .returning(['id', 'email', 'first_name', 'last_name', 'created_at', 'updated_at'])
            .executeTakeFirstOrThrow();
    },

    /**
     * Update a user by ID
     */
    async update(id: string, data: UserUpdate): Promise<SafeUser | undefined> {
        return await db
            .updateTable('users')
            .set({
                ...data,
                updated_at: new Date()
            })
            .where('id', '=', id)
            .returning(['id', 'email', 'first_name', 'last_name', 'created_at', 'updated_at'])
            .executeTakeFirst();
    },

    /**
     * Delete a user by ID
     */
    async delete(id: string): Promise<void> {
        await db
            .deleteFrom('users')
            .where('id', '=', id)
            .execute();
    }
};