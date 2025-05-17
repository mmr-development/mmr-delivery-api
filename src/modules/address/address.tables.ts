import { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface CountryTable {
    id: Generated<number>;
    name: string;
    iso: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type CountryRow = Selectable<CountryTable>;
export type InsertableCountryRow = Insertable<CountryTable>;
export type UpdateableCountryRow = Updateable<CountryTable>;

export interface CityTable {
    id: Generated<number>;
    name: string;
    country_id: number;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type CityRow = Selectable<CityTable>;
export type InsertableCityRow = Insertable<CityTable>;
export type UpdateableCityRow = Updateable<CityTable>;

export interface PostalCodeTable {
    id: Generated<number>;
    code: string;
    city_id: number;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type PostalCodeRow = Selectable<PostalCodeTable>;
export type InsertablePostalCodeRow = Insertable<PostalCodeTable>;
export type UpdateablePostalCodeRow = Updateable<PostalCodeTable>;

export interface StreetTable {
    id: Generated<number>;
    name: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type StreetRow = Selectable<StreetTable>;
export type InsertableStreetRow = Insertable<StreetTable>;
export type UpdateableStreetRow = Updateable<StreetTable>;

export interface AddressTable {
    id: Generated<number>;
    street_id: number;
    address_detail: string;
    postal_code_id: number;
    latitude: number;
    longitude: number;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type AddressRow = Selectable<AddressTable>;
export type InsertableAddressRow = Insertable<AddressTable>;
export type UpdateableAddressRow = Updateable<AddressTable>;

export interface CompleteAddressRow {
    id: number;
    street_name: string;
    address_detail: string;
    postal_code: string;
    city_name: string;
    country_name: string;
    country_iso: string;
    latitude: number;
    longitude: number;
}
