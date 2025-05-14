import { CustomerRepository } from './customer.repository';
import { CustomerRow, InsertableCustomerRow } from './customer.table';

export interface CustomerService {
    createOrFindCustomer(customer: InsertableCustomerRow): Promise<CustomerRow>;
    createCustomer(customer: InsertableCustomerRow): Promise<CustomerRow>;
    findCustomerById(id: number): Promise<CustomerRow | undefined>;
    findCustomerByUserId(user_id: string): Promise<CustomerRow | undefined>;
}

export function createCustomerService(repository: CustomerRepository): CustomerService {
    return {
        async createOrFindCustomer(customer) {
            const existing = await repository.findByUserId(customer.user_id);
            if (existing) return existing;
            return repository.create(customer);
        },
        createCustomer: (customer) => repository.create(customer),
        findCustomerById: (id) => repository.findById(id),
        findCustomerByUserId: (user_id) => repository.findByUserId(user_id),
    };
}
