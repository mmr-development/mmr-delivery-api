import { Partner, PartnerApplicationRequest, PartnerWithRelations } from './partner';
import { PartnerApplicationRepository } from './partner-application.repository';
import { PartnerRow, PartnerWithRelationsRow } from './partner.table';
import { UserService } from '../users/user.service';

export interface PartnerApplicationService {
    submitApplication(application: PartnerApplicationRequest): Promise<Partner>;
    getAllPartnerApplications(): Promise<PartnerWithRelations[]>;
    getPartnerApplicationById(id: number): Promise<PartnerWithRelations | undefined>;
}

export function createPartnerApplicationService(repository: PartnerApplicationRepository, userService: UserService): PartnerApplicationService {
    return {
        submitApplication: async function (application: PartnerApplicationRequest): Promise<Partner> {
            const user = await userService.createPartnerUser({
                first_name: application.contact_person.first_name,
                last_name: application.contact_person.last_name,
                email: application.contact_person.email,
                phone_number: application.contact_person.phone_number,
            })

            const partnerRow = await repository.create({
                name: application.business.name,
                delivery_method_id: application.delivery_method_id,
                business_type_id: application.business_type_id,
                user_id: user.id,
            });

            return partnerRowToPartner(partnerRow);
        },
        getAllPartnerApplications: async function (): Promise<PartnerWithRelations[]> {
            const partnerRows = await repository.findAll();
            return partnerRows.map(partnerWithRelationsRowToPartner);
        },
        getPartnerApplicationById: async function (id: number): Promise<PartnerWithRelations | undefined> {
            const partnerRow = await repository.findById(id);

            if(partnerRow) {
                return partnerWithRelationsRowToPartner(partnerRow);
            }
        },
    }
}

export function partnerRowToPartner(partner: PartnerRow): Partner {
    return {
        id: partner.id,
        name: partner.name,
        delivery_method_id: partner.delivery_method_id,
        business_type_id: partner.business_type_id,
        user_id: partner.user_id,
    }
}

export function partnerWithRelationsRowToPartner(row: PartnerWithRelationsRow): PartnerWithRelations {
    return {
        id: row.id,
        name: row.name,
        business_type: {
            id: row.business_type_id,
            name: row.business_type_name
        },
        delivery_method: {
            id: row.delivery_method_id,
            name: row.delivery_method_name
        },
        owner: {
            id: row.user_id,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.user_email,
            phone_number: row.phone_number,
        }
    };
}
