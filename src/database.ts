import { UserTable } from './modules/users/user.table';
import { RefreshTokenTable } from './modules/authentication/refresh-token.table';
import { SignInMethodTable } from './modules/users/sign-in-method/sign-in-method.table';
import { PasswordSignInMethodTable } from './modules/users/sign-in-method/password-sign-in-method.table';
import { PasswordResetTokenTable } from './modules/authentication/password-reset-token.table';
import { PartnerTable } from './modules/partner/partner.table';
import { DeliveryMethodTable } from './modules/partner/delivery-method/delivery-method.table';
import { BusinessTypeTable } from './modules/partner/business-type/business-type.table';
import { CatalogTable } from './modules/partner/catalog/catalog.table';
import { CatalogCategoryTable } from './modules/partner/catalog/catalog-category.table';
import { CatalogItemTable } from './modules/partner/catalog/catalog-item.table';
import { PartnerHourTable } from './modules/partner/partner-hour.table';

export interface Database {
    refresh_token: RefreshTokenTable;
    user: UserTable;
    sign_in_method: SignInMethodTable;
    password_sign_in_method: PasswordSignInMethodTable;
    password_reset_token: PasswordResetTokenTable;
    partner: PartnerTable;
    delivery_method: DeliveryMethodTable;
    business_type: BusinessTypeTable;
    catalog: CatalogTable;
    catalog_category: CatalogCategoryTable;
    catalog_item: CatalogItemTable;
    partner_hour: PartnerHourTable;
}
