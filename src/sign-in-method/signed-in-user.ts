import { AccessToken } from "../authentication-token.service";
import { RefreshToken } from "../authentication-token.service";

export interface SignedInUser {
    refreshToken: RefreshToken;
    accessToken: AccessToken;
}
