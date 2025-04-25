import { CreateCustomerUserRequest, User } from './user';
import { UserRepository } from './user.repository';
import { UserRow } from './user.table';
import { Kysely, Transaction } from 'kysely'
import { Database } from '../../database';
import { SignInMethodService } from '../sign-in-method';

export interface UserService {
    insertUser(trx: Transaction<Database>, userRequest: CreateCustomerUserRequest): Promise<User>;
    findUserById(userId: string): Promise<User | undefined>;
    lockUserByEmail(trx: Transaction<Database>, email: string): Promise<User | undefined>;
    lockUserById(trx: Transaction<Database>, id: string): Promise<User | undefined>;
}

export function createUserService(repository: UserRepository): UserService {
    return {
        insertUser: async function(trx: Transaction<Database>, userRequest: CreateCustomerUserRequest): Promise<User> {
            const userRow = await repository.insertUser(trx, {
                first_name: userRequest.first_name,
                last_name: userRequest.last_name,
                email: userRequest.email
            });

            return userRowToUser(userRow);
            },
        findUserById: async function (userId: string): Promise<User | undefined> {
            const userRow = await repository.findUserById(userId);

            if (userRow) {
                return userRowToUser(userRow);
            }
        },
        lockUserByEmail: async function(trx: Transaction<Database>, email: string): Promise<User | undefined> {
            const userRow = await repository.lockUserByEmail(trx, email);

            if(userRow) {
                return userRowToUser(userRow);
            }
        },
        lockUserById: async function(trx: Transaction<Database>, id: string): Promise<User | undefined> {
            const userRow = await repository.lockUserById(trx, id);

            if(userRow) {
                return userRowToUser(userRow);
            }
        }
    }
}

export function userRowToUser(user: UserRow): User {
    return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email
    }
}