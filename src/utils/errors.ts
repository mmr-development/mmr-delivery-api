export type AuthenticationErrors =
  | 'NoUserIdParameter'
  | 'InvalidAuthorizationHeader'
  | 'InvalidAuthToken'
  | 'ExpiredAuthToken'
  | 'UserMismatch'
  | 'UserOrRefreshTokenNotFound';

export type UserApiErrors = 'InvalidUser' | 'UserNotFound' | 'EmailAlreadyExists';

export type SignInMethodApiErrors =
  | 'InvalidSignInMethod'
  | 'UserAlreadyHasSignInMethod'
  | 'PasswordTooWeak'
  | 'PasswordTooLong'
  | 'InvalidCredentials'
  | 'InvalidRefreshToken'
  | 'RefreshTokenUserIdMismatch';

export type PartnerApiErrors =
  | 'PartnerNotFound';

 export type CatalogApiErrors =
  | 'CatalogItemNotFound'
  | 'PriceNotFound';

  export type OrderApiErrors =
  | 'OrderNotFound'

export type ErrorCode =
  | 'UnknownError'
  | AuthenticationErrors
  | UserApiErrors
  | SignInMethodApiErrors
  | CatalogApiErrors
  | OrderApiErrors
  | PartnerApiErrors;

export type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 500;

const statusCodeToMessage: Record<ErrorStatus, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

export class ControllerError extends Error {
  readonly status: ErrorStatus;
  readonly code: ErrorCode;
  readonly data?: any;

  constructor(
    status: ErrorStatus,
    code: ErrorCode,
    message: string,
    data?: any
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      statusCode: this.status,
      error: statusCodeToMessage[this.status],
      message: this.message,
      code: this.code,
      ...(this.data ? { data: this.data } : {}),
    };
  }
}