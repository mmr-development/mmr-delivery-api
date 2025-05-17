import { Kysely } from "kysely";
import { Database } from "../../../database";
import { UserRoleRepository } from "./user-role.repository";
import { UserRoleRow, UserRoleWithName } from "./user-role.table";

export interface UserRoleService {
    assignRoleToUser: (userId: string, roleId: string) => Promise<void>;
    assignRole: (userId: string, roleId: string) => Promise<void>; // Alias for backward compatibility
    getUserRoles: (userId: string, role: string) => Promise<UserRoleWithName>;
    hasRole: (userId: string, role: string) => Promise<boolean>;
}

export function createUserRoleService(repository: UserRoleRepository): UserRoleService {
    return {
        assignRoleToUser: async function (userId: string, roleId: string): Promise<void> {
            try {
                // Check if the user already has this role to avoid unique constraint violation
                const hasRole = await repository.hasUserRole(userId, roleId);
                if (!hasRole) {
                    await repository.assignRoleToUser(userId, roleId);
                }
            } catch (error) {
                console.error('Error assigning role to user:', error);
                throw error;
            }
        },
        // Alias for backward compatibility
        assignRole: async function (userId: string, roleId: string): Promise<void> {
            return this.assignRoleToUser(userId, roleId);
        },
        getUserRoles: async function (userId: string, role: string): Promise<UserRoleWithName> {
            const userRole = await repository.getUserRole(userId, role);
            if (!userRole) {
                throw new Error(`User role not found for userId: ${userId} and role: ${role}`);
            }
            return userRole;
        },
        hasRole: async function (userId: string, role: string): Promise<boolean> {
            try {
                return await repository.hasUserRole(userId, role);
            } catch (error) {
                console.error('Error checking if user has role:', error);
                return false;
            }
        },
    };
}

