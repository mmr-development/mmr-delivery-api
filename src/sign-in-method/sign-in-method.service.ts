import { UserService } from '../users/user.service';
import { AuthenticationTokenService } from '../authentication/authentication-token.service';
import { PasswordSignInMethod } from './sign-in-method';
import { SignedInUser } from './signed-in-user';
import { SignInMethodRepository } from './sign-in-method.repository';
import * as argon2 from 'argon2';
import {
    UserNotFoundError,
    InvalidCredentialsError,
    ControllerError
} from '../utils/errors';
import { Transaction } from 'kysely';
import { Database } from '../types/kysely.types';
import { CreateCustomerUserRequest } from '../users/user';

export class UserAlreadyHasSignInMethodError extends Error {}
export class EmailAlreadyExistsError extends Error {}

export interface SignInMethodService {
    signUpWithPassword(trx: Transaction<Database>, method: CreateCustomerUserRequest): Promise<SignedInUser>;
    addPasswordSignInMethod(trx: Transaction<Database>, userId: string, method: PasswordSignInMethod): Promise<void>;
    signInUsingPassword(trx: Transaction<Database>, method: PasswordSignInMethod): Promise<SignedInUser>;
}

export function createSignInMethodService(authenticationTokenService: AuthenticationTokenService, userService: UserService, signInMethodRepository: SignInMethodRepository) {
    return {
        addPasswordSignInMethod: async function(trx: Transaction<Database>, userId: string, method: PasswordSignInMethod): Promise<void> {
            const user = await userService.lockUserById(trx, userId);

            if (!user) {
                throw new UserNotFoundError('User not found');
            }

            if(user.email) {
                console.log('User email:', user.email);
                throw new UserAlreadyHasSignInMethodError();
            }

            await signInMethodRepository.insertPasswordSignInMethod(trx, {
                user_id: user.id,
                password_hash: await argon2.hash(method.password, { type: argon2.argon2id }),
            })
        },
        signUpWithPassword: async function(trx: Transaction<Database>, method: CreateCustomerUserRequest): Promise<SignedInUser> {
            const existingUser = await userService.lockUserByEmail(trx, method.email);
            if (existingUser) {
              throw new EmailAlreadyExistsError();
            }

            const user = await userService.insertUser(trx, { 
                email: method.email,
                first_name: method.first_name,
                last_name: method.last_name,
                password: method.password
              });

            await signInMethodRepository.insertPasswordSignInMethod(trx, {
                user_id: user.id,
                password_hash: await encryptPassword(method.password),
              });
            
              // Generate tokens
              const refreshToken = await authenticationTokenService.createRefreshToken(user.id);
              const accessToken = await authenticationTokenService.createAccessToken(refreshToken.refreshToken);
            
              return {
                accessToken,
                refreshToken,
              };
        },
        signInUsingPassword: async function (trx: Transaction<Database>, method: PasswordSignInMethod): Promise<SignedInUser> {
            const user = await userService.lockUserByEmail(trx, method.email);

            if (!user) {
                throw new InvalidCredentialsError('The email or password you entered is incorrect');
            }

            const signInMethod = await signInMethodRepository.findPasswordSignInMethod(trx, user.id);

            if (!signInMethod) {
                throw new ControllerError(404, 'InvalidSignInMethod', 'Password sign-in method not found for this user');
            }

            if (!(await verifyPassword(method.password, signInMethod.password_hash))) {
                throw new InvalidCredentialsError('The email or password you entered is incorrect');
            }

            const refreshToken = await authenticationTokenService.createRefreshToken(user.id);
            const accessToken = await authenticationTokenService.createAccessToken(refreshToken.refreshToken);

            return {
                accessToken,
                refreshToken
            }
        }
    }
}

async function encryptPassword(plainPassword: string): Promise<string> {
    try {
        return await argon2.hash(plainPassword, { 
            type: argon2.argon2id,
        });
    } catch (error) {
        console.error('Password encryption error:', error);
        throw new Error('Failed to encrypt password');
    }
}

async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
        return await argon2.verify(hashedPassword, plainPassword);
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
}
