import { PartnerHourRepository } from './partner-hour.repository';
import { PartnerHourRow, InsertablePartnerHourRow, UpdateablePartnerHourRow } from './partner-hour.table';

export interface PartnerHourService {
    createPartnerHour(hour: InsertablePartnerHourRow): Promise<PartnerHourRow>;
    getAllPartnerHours(): Promise<{ hours: PartnerHourRow[] }>;
    getPartnerHourById(id: number): Promise<PartnerHourRow | undefined>;
    getPartnerHoursByPartnerId(partner_id: number): Promise<{ hours: PartnerHourRow[] }>;
    updatePartnerHour(id: number, hour: UpdateablePartnerHourRow): Promise<PartnerHourRow>;
    deletePartnerHour(id: number): Promise<void>;
}

export function createPartnerHourService(repository: PartnerHourRepository): PartnerHourService {
    return {
        createPartnerHour: (hour) => repository.create(hour),
        getAllPartnerHours: async () => ({ hours: await repository.findAll() }),
        getPartnerHourById: (id) => repository.findById(id),
        getPartnerHoursByPartnerId: async (partner_id) => ({ hours: await repository.findByPartnerId(partner_id) }),
        updatePartnerHour: (id, hour) => repository.update(id, hour),
        deletePartnerHour: (id) => repository.delete(id),
    };
}
