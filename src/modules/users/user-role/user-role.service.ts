import { Kysely } from "kysely";
import { Database } from "../../../database";
import { UserRoleRepository } from "./user-role.repository";
import { UserRoleRow, UserRoleWithName } from "./user-role.table";

export interface UserRoleService {
    assignRoleToUser: (userId: string, roleId: string) => Promise<void>;
    getUserRoles: (userId: string, clientId: string) => Promise<UserRoleWithName>;
}

export function createUserRoleService(repository: UserRoleRepository): UserRoleService {
    return {
        assignRoleToUser: async function (userId: string, roleId: string): Promise<void> {
            await repository.assignRoleToUser(userId, roleId);
        },
        getUserRoles: async function (userId: string, clientId: string): Promise<UserRoleWithName> {
            const userRole = await repository.getUserRole(userId, clientId);
            if (!userRole) {
                throw new Error(`User role not found for userId: ${userId} and clientId: ${clientId}`);
            }
            return userRole;
        },
    };
}

