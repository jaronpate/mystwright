import bcrypt from 'bcrypt';
import { generateTokenSet } from '../middleware/auth';
import { errorResponse, jsonResponse } from '../utils/responses';
import { userRepository } from '../repositories/userRepository';
import { db, Token } from '@mystwright/db';

/**
 * Controller for user authentication operations
 */
export const authController = {
    /**
     * User registration/signup
     */
    async signup(req: Request): Promise<Response> {
        try {
            const { email, password, first_name, last_name } = await req.json() as Record<string, any>;

            // Basic validation
            if (!email || !password) {
                return errorResponse('Email and password are required', req, 400);
            }

            // Check if user already exists
            const existingUser = await userRepository.findByEmail(email);

            if (existingUser) {
                return errorResponse('User already exists', req, 400);
            }

            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Create new user
            const newUser = await userRepository.create({
                email,
                password_hash: passwordHash,
                first_name,
                last_name: last_name || null
            });

            const { accessToken, refreshToken, expiresIn } = await generateTokenSet(newUser);

            return jsonResponse({
                message: 'User registered successfully',
                user: { id: newUser.id, email: newUser.email, first_name: newUser.first_name, last_name: newUser.last_name },
                id_token: accessToken.value,
                access_token: accessToken.value,
                refresh_token: refreshToken.value,
                expires_in: expiresIn
            }, req, 201);
        } catch (error) {
            console.error('Signup error:', error);
            return errorResponse('Error during signup', req, 500);
        }
    },

    /**
     * User login
     */
    async login(req: Request): Promise<Response> {
        try {
            const { email, password } = await req.json() as Record<string, any>;

            // Basic validation
            if (!email || !password) {
                return errorResponse('Email and password are required', req, 400);
            }

            // Find user by email
            const user = await userRepository.findByEmail(email);

            // Check if user exists and password is correct
            if (!user || !(await bcrypt.compare(password, user.password_hash))) {
                return errorResponse('Invalid email or password', req, 401);
            }

            const { accessToken, refreshToken, expiresIn } = await generateTokenSet(user);

            return jsonResponse({
                message: 'Login successful',
                user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
                id_token: accessToken.value,
                access_token: accessToken.value,
                refresh_token: refreshToken.value,
                expires_in: expiresIn

            }, req, 200);
        } catch (error) {
            console.error('Login error:', error);
            return errorResponse('Error during login', req, 500);
        }
    },

    async token(req: Request): Promise<Response> {
        try {
            const { refresh_token, grant_type } = await req.json() as Record<string, any>;

            if (grant_type === 'refresh_token') {
                if (!refresh_token) {
                    return errorResponse('Refresh token is required', req, 400);
                }
    
                // Verify refresh token
                const tokenData = await db
                    .selectFrom('refresh_tokens')
                    .selectAll()
                    .where('value', '=', refresh_token)
                    .where((q) => q('expires_at', '>', new Date()).or('expires_at', 'is', null))
                    .executeTakeFirst();
    
                if (!tokenData) {
                    return errorResponse('Invalid or expired refresh token', req, 401);
                }

                const refresh = Token.fromDB(tokenData);
    
                const user = await userRepository.findById(tokenData.user_id);

                if (!user) {
                    return errorResponse('User not found', req, 404);
                }
    
                const { accessToken, refreshToken, expiresIn } = await generateTokenSet(user, refresh.id);
                
                return jsonResponse({
                    id_token: accessToken.value,
                    access_token: accessToken.value,
                    refresh_token: refreshToken.value,
                    expires_in: expiresIn
                }, req, 200);
            } else {
                return errorResponse('Invalid grant type', req, 400);
            }
        } catch (error) {
            console.error('Token exchange error:', error);
            return errorResponse('Error during refresh token', req, 500);
        }
    },

    /**
     * Get current user profile
     */
    async getProfile(req: Request): Promise<Response> {
        try {
            // The auth middleware should have added the user object to the request
            const user = req.user;

            if (!user) {
                return errorResponse('Unauthorized', req, 401);
            }

            // Get user details from database
            const userProfile = await userRepository.findById(user.id);

            if (!userProfile) {
                return errorResponse('User not found', req, 404);
            }

            // Create safe user data without password
            const { password_hash, ...userWithoutPassword } = userProfile;

            return jsonResponse({ user: userWithoutPassword }, req);
        } catch (error) {
            console.error('Get profile error:', error);
            return errorResponse('Failed to get user profile', req, 500);
        }
    }
};