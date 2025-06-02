import { AccessToken, RefreshToken } from "../../authentication/authentication-token.service";
import { User } from "../user.schema";

export interface SignedInUser {
    refreshToken: RefreshToken;
    accessToken: AccessToken;
    user: User;
}
