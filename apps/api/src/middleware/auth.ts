import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { errorResponse } from '../utils/responses';
import { db, Token, TokenType } from '../db';
import type { NewAccessToken, NewRefreshToken, DBRefreshToken, SafeUser, User } from '../db';

/**
 * Interface for JWT payload with user data
 */
export interface JwtPayload {
    id: string;
    email: string;
}

// Hack to allow adding properties to Request object
// This creates a declaration merging for the Request interface
declare global {
    interface Request {
        user?: JwtPayload;
    }
}

/**
 * Extend Bun's Request interface to include user data
 */
export interface AuthenticatedRequest extends Request {
    user: JwtPayload;
}

export type APIRequest = Request | AuthenticatedRequest;

/**
 * Middleware to verify JWT and attach user data to request
 */
export async function authMiddleware(req: APIRequest): Promise<AuthenticatedRequest | Response> {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return errorResponse({
            code: 'UNAUTHORIZED',
            details: 'Authorization header must start with Bearer'
        }, req, 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return errorResponse({
            code: 'UNAUTHORIZED',
            details: 'No token provided'
        }, req, 401);
    }

    try {
        // First ensure JWT_SECRET is defined, then verify and cast properly
        if (!config.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }

        const tk = await db.selectFrom('access_tokens')
            .selectAll()
            .where('value', '=', token)
            // Where expires_at is greater than now or null
            .where((q) => q('expires_at', '>', new Date()).or('expires_at', 'is', null))
            .executeTakeFirst();

        if (tk === null || tk === undefined) {
            return errorResponse({
                code: 'UNAUTHORIZED',
                details: 'Token not found or expired'
            }, req, 401);
        }

        // Verify the token
        const decoded = jwt.verify(token, config.JWT_SECRET as string) as unknown as JwtPayload;
        
        // Create a modified request with user data attached
        const authenticatedReq = req.clone() as AuthenticatedRequest;
        authenticatedReq.user = decoded;
        
        return authenticatedReq;
    } catch (error) {
        console.error('JWT verification error:', error);
        return errorResponse({
            code: 'UNAUTHORIZED',
            details: 'Invalid token'
        }, req, 401);
    }
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user?: { id: string, email: string }): string {
    if (!config.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jwt.sign(
        user ? { id: user.id, email: user.email } : {},
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN } as SignOptions
    );
}

export const generateTokenSet = async (user: User | SafeUser, refresh_token_id?: string) => {
    const refresh_token = generateToken();

    // Create refresh token in the database
    const newRefreshToken: NewRefreshToken = {
        user_id: user.id,
        value: refresh_token,
        type: TokenType.User,
        scopes: [],
        properties: {}
    };

    const refreshInsert = await db.insertInto('refresh_tokens').values(newRefreshToken).executeTakeFirst() as unknown as DBRefreshToken;
    const refreshToken = Token.fromDB(refreshInsert);
    
    const access_token = generateToken({ id: user.id as string, email: user.email });

    const ACCESS_TOKEN_LIFETIME = (365 * 24 * 60 * 60 * 1000);

    // Create access token in the database
    const newAccessToken: NewAccessToken = {
        user_id: user.id,
        refresh_token_id: refresh_token_id,
        value: access_token,
        type: TokenType.User,
        scopes: [],
        properties: {},
        expires_at: new Date(Date.now() + ACCESS_TOKEN_LIFETIME) // 1 year
    };
    
    const accessInsert = await db.insertInto('access_tokens').values(newAccessToken).execute() as unknown as DBRefreshToken;
    const accessToken = Token.fromDB(accessInsert);

    return {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_LIFETIME,
        expiresAt: accessToken.expires_at
    };
};