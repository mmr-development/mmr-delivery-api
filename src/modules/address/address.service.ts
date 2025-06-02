import { AddressRepository } from './address.repository';

export interface AddressService {
    createAddress(address: AddressInput): Promise<number>;
    createOrUpdateAddress(entityId: string, addressData: AddressUpdateInput, entityType?: 'user' | 'partner'): Promise<number>;
}

export interface AddressInput {
    street: string;
    address_detail?: string;
    postal_code: string;
    city: string;
    country: string;
    country_iso?: string;
    latitude?: number;
    longitude?: number;
}

export interface AddressUpdateInput {
    street?: string;
    address_detail?: string;
    postal_code?: string;
    city?: string;
    country?: string;
    country_iso?: string;
    latitude?: number;
    longitude?: number;
}

export function isCompleteAddress(address: AddressUpdateInput): address is AddressInput {
    return !!(address.street && address.postal_code && address.city && address.country);
}

export function createAddressService(repository: AddressRepository): AddressService {
    return {
        async createAddress(address: AddressInput): Promise<number> {
            const countryId = await repository.findOrCreateCountry(address.country, address.country_iso);
            const cityId = await repository.findOrCreateCity(address.city, countryId);
            const streetId = await repository.findOrCreateStreet(address.street, cityId);
            const postalCodeId = await repository.findOrCreatePostalCode(address.postal_code, cityId);

            const addressId = await repository.findOrCreateAddress(
                streetId,
                address.address_detail || '',
                postalCodeId,
                address.latitude || 0,
                address.longitude || 0
            );

            return addressId;
        },
        async createOrUpdateAddress(entityId: string, addressData: AddressUpdateInput, entityType: 'user' | 'partner' = 'user'): Promise<number> {
            let existingAddressId: number | null = null;

            if (entityType === 'user') {
                existingAddressId = await repository.getUserAddressId(entityId);
            } else if (entityType === 'partner') {
                existingAddressId = await repository.getPartnerAddressId(parseInt(entityId, 10));
            }

            if (existingAddressId && !isCompleteAddress(addressData)) {
                await repository.updateAddress(existingAddressId, addressData);
                return existingAddressId;
            }
            else if (isCompleteAddress(addressData)) {
                const existingAddress = await repository.findAddressByDetails({
                    street: addressData.street,
                    postal_code: addressData.postal_code,
                    city: addressData.city,
                    country: addressData.country,
                    address_detail: addressData.address_detail || ''
                });

                if (existingAddress) {
                    return existingAddress.id;
                } else {
                    const addressId = await this.createAddress(addressData);
                    return addressId;
                }
            }
            else {
                throw new Error('Cannot create new address: missing required fields');
            }
        }
    }
}
