import { AccessToken, RefreshToken } from "../../authentication/authentication-token.service";

export interface SignedInUser {
    refreshToken: RefreshToken;
    accessToken: AccessToken;
}
