import { User, UserUpdateResponse, UserWithAddress } from './user.schema';
import { CreateAnonymousUserRequest, CreateCustomerUserRequest, CreateCustomerUserRequestWithoutPassword, CreatePartnerUserRequest } from './user';
import { UserRepository } from './user.repository';
import { UserRow } from './user.table';
import { Kysely, Transaction } from 'kysely'
import { Database } from '../../database';
import { UserRoleService } from './user-role/user-role.service';
import { UserRoleRow, UserRoleWithName } from './user-role/user-role.table';
import { AddressService } from '../address';
import { EmailAlreadyExistsError } from './sign-in-method';

export interface UserService {
    insertUser(trx: Transaction<Database>, userRequest: CreateCustomerUserRequest): Promise<User>;
    createAnonymousUser(trx: Transaction<Database>, request: CreateAnonymousUserRequest): Promise<User>;
    createCustomerUser(userRequest: CreateCustomerUserRequestWithoutPassword): Promise<User>;
    createPartnerUser(request: CreatePartnerUserRequest): Promise<User>;
    createCourierUser(request: CreatePartnerUserRequest): Promise<User>;
    findUserById(userId: string): Promise<User | undefined>;
    findUserByEmail(email: string): Promise<User | undefined>;
    lockUserByEmail(trx: Transaction<Database>, email: string): Promise<User | undefined>;
    lockUserById(trx: Transaction<Database>, id: string): Promise<User | undefined>;
    getUserRole(userId: string, role: string): Promise<UserRoleWithName>;
    assignRoleToUser(trx: Transaction<Database>, userId: string, roleId: string): Promise<void>;
    assignRoleToUserSimple(userId: string, roleId: string): Promise<void>;
    findAllUsers(options?: { offset?: number; limit?: number, filters?: { email?: string; name?: string; phone_number?: string; } }): Promise<{ users: User[]; count?: number; }>;
    removeAllUserRoles(trx: Transaction<Database>, userId: string): Promise<void>;
    savePushToken(userId: string, pushToken: string, appType: string): Promise<void>;
    findUserWithAddressById(id: string): Promise<UserWithAddress | undefined>;
    updateUserProfile(userId: string, profileData: Partial<UpdateUserProfileRequest>): Promise<UserUpdateResponse>;
    updateUserById(userId: string, profileData: Partial<UpdateUserProfileRequest>): Promise<UserUpdateResponse>;
}

interface UpdateUserProfileRequest {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    address?: {
        street?: string;
        address_detail?: string;
        postal_code?: string;
        city?: string;
        country?: string;
        country_iso?: string;
        latitude?: number;
        longitude?: number;
    };
}

export function createUserService(repository: UserRepository, userRoleService: UserRoleService, addressService: AddressService): UserService {
    return {
        createAnonymousUser: async function (trx: Transaction<Database>, request: CreateAnonymousUserRequest): Promise<User> {
            const userRow = await repository.createAnonymousUser(trx, request);

            if (!userRow) {
                throw new Error('Failed to create anonymous user');
            }

            return userRowToUser(userRow);
        },
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
        createCustomerUser: async function (userRequest: CreateCustomerUserRequestWithoutPassword): Promise<User> {
            const existingUser = await repository.findUserByEmail(userRequest.email);

            if (existingUser) {
                return userRowToUser(existingUser);
            }

            const userRow = await repository.createCustomerUser({
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
        createCourierUser: async function (request: CreatePartnerUserRequest): Promise<User> {
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
        findUserById: async function (userId: string): Promise<UserWithAddress | undefined> {
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
        getUserRole: async function (userId: string, role: string): Promise<UserRoleWithName> {
            const userRole = await userRoleService.getUserRoles(userId, role);

            if (!userRole) {
                throw new Error(`User role not found for userId: ${userId} and clientId: ${role}`);
            }

            return userRole;
        },
        assignRoleToUser: async function (trx: Transaction<Database>, userId: string, roleId: string): Promise<void> {
            await userRoleService.assignRole(userId, roleId);
        },
        assignRoleToUserSimple: async function (userId: string, roleId: string): Promise<void> {
            await userRoleService.assignRole(userId, roleId);
        },
        findAllUsers: async function (options?: { offset?: number; limit?: number, filters?: { email?: string; name?: string; phone_number?: string; } }): Promise<{ users: User[]; count?: number; }> {
            const result = await repository.findAllUsers(options);
            return {
                users: result.users.map(userRowWithRolesToUser),
                count: result.count
            };
        },
        findUserWithAddressById: async function (id: string): Promise<UserWithAddress | undefined> {
            const userRow = await repository.findUserWithAddressById(id);

            if (userRow) {
                return userRowWithAddressToUser(userRow);
            }
        },
        updateUserProfile: async function (userId: string, profileData: Partial<UpdateUserProfileRequest>): Promise<UserUpdateResponse> {
            const { address, ...userData } = profileData;
            console.log('Updating user profile for userId:', userId, 'with data:', userData, 'and address:', address);
            // Update basic user data
            if (Object.keys(userData).length > 0) {
                await repository.updateUserProfile(userId, userData);
            }

            // Handle address update if provided
            if (address) {
                try {
                    // Use the new method that handles both scenarios
                    const addressId = await addressService.createOrUpdateAddress(userId, address);
                    console.log('Address updated or created with ID:', addressId);

                    // If we're here, we either updated an existing address or created a new one
                    // Make sure the user is associated with this address
                    await repository.associateAddressWithUser(userId, addressId);
                    console.log('User associated with address successfully:', userId, addressId);
                } catch (error) {
                    // Log error but continue with user update
                    console.error('Failed to update address:', error);
                }
            }

            // Fetch and return the updated user with address
            const updatedUser = await repository.findUserWithAddressById(userId);
            if (!updatedUser) {
                throw new Error('Failed to retrieve updated user');
            }

            return {
                message: "User updated successfully",
                user: userRowWithAddressToUser(updatedUser)
            };
        },
        savePushToken: async function (userId: string, pushToken: string, appType: string): Promise<void> {
            await repository.savePushToken(userId, pushToken, appType);
        },
        removeAllUserRoles: async function (trx: Transaction<Database>, userId: string): Promise<void> {
            await userRoleService.removeAllUserRoles(userId);
        },
        updateUserById: async function (userId: string, profileData: Partial<UpdateUserProfileRequest>): Promise<UserUpdateResponse> {
            const { address, ...userData } = profileData;

            // Update basic user data
            if (Object.keys(userData).length > 0) {
                await repository.updateUserById(userId, userData);
                console.log('User updated successfully:', userId);
            } else {
                console.log('No user data to update, skipping user update');
            }

            // Handle address update if provided
            if (address) {
                try {
                    // Use the new method that handles both scenarios
                    const addressId = await addressService.createOrUpdateAddress(userId, address);

                    // If we're here, we either updated an existing address or created a new one
                    // Make sure the user is associated with this address
                    await repository.associateAddressWithUser(userId, addressId);
                } catch (error) {
                    // Continue with the user update even if address fails
                }
            }

            // Fetch and return the updated user with address
            const updatedUser = await repository.findUserWithAddressById(userId);
            if (!updatedUser) {
                throw new Error('Failed to retrieve updated user');
            }
            console.log('User updated with address successfully:', updatedUser);
            return {
                message: "User updated successfully",
                user: userRowWithAddressToUser(updatedUser)
            };
        }
    }
}

export function userRowToUser(user: UserRow): User {
    return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
    }
}

export function userRowWithAddressToUser(user: UserRow & { address?: any }): UserWithAddress {
    return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
        address: user.address ? {
            id: user.address.id,
            address_detail: user.address.address_detail,
            latitude: user.address.latitude,
            longitude: user.address.longitude,
            street: user.address.street,
            postal_code: user.address.postal_code,
            city: user.address.city,
            country: user.address.country,
        } : undefined
    }
}

export function userRowWithRolesToUser(user: UserRow & { roles?: { id: string; name: string; description?: string }[] }): User {
    return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
        roles: user.roles ?? []
    }
}
