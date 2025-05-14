import { Partner } from './partner';
import { PartnerApplicationList, PartnerApplicationRequest, PartnerApplicationResponse, PartnerApplicationUpdate } from './partner.schema';
import { PartnerApplicationRepository } from './partner-application.repository';
import { PartnerRow, PartnerWithRelationsRow } from './partner.table';
import { UserService } from '../users/user.service';
import { AddressService } from '../address';

export interface PartnerApplicationService {
    submitApplication(application: PartnerApplicationRequest): Promise<Partner>;
    getAllPartnerApplications(options?: { offset?: number; limit?: number; filters?: { status?: string; }}): Promise<{ applications: PartnerApplicationResponse[]; count: number }>;
    getPartnerApplicationById(id: number): Promise<PartnerApplicationResponse | undefined>;
    updateApplication(id: number, updateData: PartnerApplicationUpdate): Promise<PartnerApplicationResponse>;
    deleteApplication(id: number): Promise<void>;
}

export function createPartnerApplicationService(repository: PartnerApplicationRepository, userService: UserService, addressService: AddressService): PartnerApplicationService {
    return {
        submitApplication: async function (application: PartnerApplicationRequest): Promise<Partner> {
            const user = await userService.createPartnerUser({
                first_name: application.contact_person.first_name,
                last_name: application.contact_person.last_name,
                email: application.contact_person.email,
                phone_number: application.contact_person.phone_number,
            });

            const addressId = await addressService.createAddress({
                street: application.business.address.street,
                addressDetail: application.business.address.address_detail,
                postalCode: application.business.address.postal_code,
                city: application.business.address.city,
                latitude: application.business.address.latitude,
                longitude: application.business.address.longitude,
                country: application.business.address.country || '',
            })

            const partnerRow = await repository.create({
                name: application.business.name,
                phone_number: application.business.phone_number,
                delivery_method_id: application.delivery_method_id,
                business_type_id: application.business_type_id,
                address_id: addressId,
                user_id: user.id,
            });

            return partnerRowToPartner(partnerRow);
        },
        getAllPartnerApplications: async function (options?: { offset?: number; limit?: number; filters?: { status?: string;} }): Promise<{ applications: PartnerApplicationResponse[]; count: number }> {
            const result = await repository.findAll(options);
            return {
                applications: result.applications.map(mapRowToApplication),
                count: result.count,
            };
        },
        getPartnerApplicationById: async function (id: number): Promise<PartnerApplicationResponse | undefined> {
            const partnerRow = await repository.findById(id);

            if (partnerRow) {
                return mapRowToApplication(partnerRow);
            }
        },
        updateApplication: async function (id: number, applicationData: PartnerApplicationUpdate): Promise<PartnerApplicationResponse> {
            const existingApplication = await repository.findById(id);
            if (!existingApplication) {
                throw new Error(`Partner application with id ${id} not found`);
            }

            // Map application data to database structure
            const updateData: Partial<PartnerRow> = {
                // Direct field mappings
                status: applicationData.status,
                phone_number: applicationData.business?.phone_number,
                delivery_method_id: applicationData.delivery_method_id,
                business_type_id: applicationData.business_type_id,
                name: applicationData.business?.name,
            };

            await repository.update(id, updateData);

            const updatedApplication = await repository.findById(id);
            if (!updatedApplication) {
                throw new Error('Failed to retrieve updated application');
            }

            return mapRowToApplication(updatedApplication);
        },
        deleteApplication: async function (id: number): Promise<void> {
            const existingApplication = await repository.findById(id);
            if (!existingApplication) {
                throw new Error(`Partner application with id ${id} not found`);
            }

            await repository.delete(id);
        },
    }
}

export function partnerRowToPartner(partner: PartnerRow): Partner {
    return {
        id: partner.id,
        name: partner.name,
        phone_number: partner.phone_number || '',
        delivery_method_id: partner.delivery_method_id,
        business_type_id: partner.business_type_id,
        user_id: partner.user_id,
    }
}

function mapRowToApplication(row: PartnerWithRelationsRow) {
    return {
        id: row.id,
        name: row.name,
        phone_number: row.phone_number || '',
        status: row.status || 'pending',
        delivery_method: {
            id: row.delivery_method_id || 0,
            name: row.delivery_method_name || ''
        },
        business_type: {
            id: row.business_type_id || 0,
            name: row.business_type_name || ''
        },
        contact_person: {
            id: row.user_id || '',
            first_name: row.first_name || '',
            last_name: row.last_name || '',
            email: row.user_email || '',
            phone_number: row.phone_number || ''
        },
        address: {
            street: row.street || '',
            city: row.city || '',
            address_detail: row.address_detail || '',
            postal_code: row.postal_code || '',
            country: row.country || ''
        },
    };
}

export function partnerWithRelationsRowToPartner(row: PartnerWithRelationsRow): PartnerApplicationList {
    return {
        applications: [mapRowToApplication(row)],
    };
}
