import { RoleRepository } from './role.repository';
import { RoleRow } from './role.table';

export interface CreateRoleRequest {
    name: string;
    description: string;
}

export interface Role {
    id: string;
    name: string;
    description: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateRoleResponse {
    role: Role;
}

export interface GetRolesOptions {
    name?: string;
    offset?: number;
    limit?: number;
}

export interface RoleService {
    createRole(request: CreateRoleRequest): Promise<CreateRoleResponse>;
    getRoles(query: GetRolesOptions): Promise<{ roles: Role[]; total: number; limit?: number; offset?: number }>;
    getRoleById(id: string): Promise<Role | null>;
    updateRole(id: string, request: Partial<CreateRoleRequest>): Promise<Role>;
    deleteRole(id: string): Promise<void>;
}

export function createRoleService(repository: RoleRepository): RoleService {
    return {
        async createRole(request: CreateRoleRequest): Promise<CreateRoleResponse> {
            const role = await repository.createRole(request);
            return {
                role: roleRowToRole(role),
            };
        },
        async getRoles(query: GetRolesOptions): Promise<{ roles: Role[]; total: number; limit?: number; offset?: number }> {
            const { roles, total } = await repository.getRoles(query);
            return {
                roles: roles.map(roleRowToRole),
                total,
                limit: query.limit,
                offset: query.offset,
            };
        },
        async getRoleById(id: string): Promise<Role | null> {
            const role = await repository.getRoleById(id);
            if (!role) return null;
            return roleRowToRole(role);
        },
        async updateRole(id: string, request: Partial<CreateRoleRequest>): Promise<Role> {
            const role = await repository.updateRole(id, request);
            return roleRowToRole(role);
        },
        async deleteRole(id: string): Promise<void> {
            await repository.deleteRole(id);
        }
    };
}

export function roleRowToRole(row: RoleRow): Role {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}