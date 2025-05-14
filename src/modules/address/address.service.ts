import { AddressRepository } from './address.repository';

export interface AddressService {
    createAddress(address: AddressInput): Promise<number>;
}

export interface AddressInput {
    street: string;
    addressDetail?: string;
    postalCode: string;
    city: string;
    country: string;
    countryIso?: string;
    latitude?: number;
    longitude?: number;
}

export function createAddressService(repository: AddressRepository): AddressService {
    return {
        async createAddress(address: AddressInput): Promise<number> {
            const countryId = await repository.findOrCreateCountry(address.country, address.countryIso);
            const cityId = await repository.findOrCreateCity(address.city, countryId);
            const streetId = await repository.findOrCreateStreet(address.street, cityId);
            const postalCodeId = await repository.findOrCreatePostalCode(address.postalCode, cityId);

            const addressId = await repository.findOrCreateAddress(
                streetId,
                address.addressDetail || '',
                postalCodeId,
                address.latitude || 0,
                address.longitude || 0
            );

            return addressId;
        }
    }
}
