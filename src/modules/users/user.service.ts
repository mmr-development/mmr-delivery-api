import { CreateCustomerUserRequest, CreatePartnerUserRequest, User } from './user';
import { UserRepository } from './user.repository';
import { UserRow } from './user.table';
import { Kysely, Transaction } from 'kysely'
import { Database } from '../../database';
import { UserRoleService } from './user-role/user-role.service';
import { UserRoleRow, UserRoleWithName } from './user-role/user-role.table';

export interface UserService {
    insertUser(trx: Transaction<Database>, userRequest: CreateCustomerUserRequest): Promise<User>;
    createPartnerUser(request: CreatePartnerUserRequest): Promise<User>;
    createCourierUser(request: CreatePartnerUserRequest): Promise<User>;
    findUserById(userId: string): Promise<User | undefined>;
    findUserByEmail(email: string): Promise<User | undefined>;
    lockUserByEmail(trx: Transaction<Database>, email: string): Promise<User | undefined>;
    lockUserById(trx: Transaction<Database>, id: string): Promise<User | undefined>;
    getUserRole(userId: string, clientId: string): Promise<UserRoleWithName>;
}

export class EmailAlreadyExistsError extends Error { }

export function createUserService(repository: UserRepository, userRoleService: UserRoleService): UserService {
    return {
        insertUser: async function (trx: Transaction<Database>, userRequest: CreateCustomerUserRequest): Promise<User> {
            const existingUser = await repository.findUserByEmail(userRequest.email);

            if (existingUser) {
                throw new EmailAlreadyExistsError('User with this email already exists');
            }

            const userRow = await repository.insertUser(trx, {
                first_name: userRequest.first_name,
                last_name: userRequest.last_name,
                email: userRequest.email,
                phone_number: userRequest.phone_number
            });

            await userRoleService.assignRoleToUser(userRow.id, 'customer');

            return userRowToUser(userRow);
        },
        createPartnerUser: async function (request: CreatePartnerUserRequest): Promise<User> {
            const existingUser = await repository.findUserByEmail(request.email);

            if (existingUser) {
                return userRowToUser(existingUser);
            }

            const userRow = await repository.createPartnerUser({
                first_name: request.first_name,
                last_name: request.last_name,
                email: request.email,
                phone_number: request.phone_number
            });

            return userRowToUser(userRow);
        },
        createCourierUser: async function(request: CreatePartnerUserRequest): Promise<User> {
        const existingUser = await repository.findUserByEmail(request.email);

        if (existingUser) {
            return userRowToUser(existingUser);
        }

        const userRow = await repository.createPartnerUser({
            first_name: request.first_name,
            last_name: request.last_name,
            email: request.email,
            phone_number: request.phone_number
        });

        return userRowToUser(userRow);
        },
        findUserById: async function (userId: string): Promise<User | undefined> {
            const userRow = await repository.findUserById(userId);

            if (userRow) {
                return userRowToUser(userRow);
            }
        },
        findUserByEmail: async function (email: string): Promise<User | undefined> {
            const userRow = await repository.findUserByEmail(email);

            if (userRow) {
                return userRowToUser(userRow);
            }
        },
        lockUserByEmail: async function (trx: Transaction<Database>, email: string): Promise<User | undefined> {
            const userRow = await repository.lockUserByEmail(trx, email);

            if (userRow) {
                return userRowToUser(userRow);
            }
        },
        lockUserById: async function (trx: Transaction<Database>, id: string): Promise<User | undefined> {
            const userRow = await repository.lockUserById(trx, id);

            if (userRow) {
                return userRowToUser(userRow);
            }
        },
        getUserRole: async function (userId: string, clientId: string): Promise<UserRoleWithName> {
            const userRole = await userRoleService.getUserRoles(userId, clientId);

            if (!userRole) {
                throw new Error(`User role not found for userId: ${userId} and clientId: ${clientId}`);
            }

            return userRole;
        }
    }
}

// export function userRoleRowToUserRole(userRole: UserRoleRow): UserRoleWithName {
//     return {
//         id: userRole.id,
//         user_id: userRole.user_id,
//         role_id: userRole.role_id,
//         role_name: userRole.role_name
//     }
// }

export function userRowToUser(user: UserRow): User {
    return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number
    }
}