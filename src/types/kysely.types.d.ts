import { UserTable } from '../modules/users/user.table';
import { RefreshTokenTable } from '../modules/authentication/refresh-token.table';
import { SignInMethodTable } from '../modules/sign-in-method/sign-in-method.table';
import { PasswordSignInMethodTable } from '../modules/sign-in-method/password-sign-in-method.table';

export interface Database {
    refresh_token: RefreshTokenTable;
    user: UserTable;
    sign_in_method: SignInMethodTable;
    password_sign_in_method: PasswordSignInMethodTable;
}
