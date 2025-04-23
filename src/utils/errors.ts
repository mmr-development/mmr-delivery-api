export type AuthenticationErrors =
  | 'NoUserIdParameter'
  | 'InvalidAuthorizationHeader'
  | 'InvalidAuthToken'
  | 'ExpiredAuthToken'
  | 'UserMismatch'
  | 'UserOrRefreshTokenNotFound';

export type UserApiErrors = 'InvalidUser' | 'UserNotFound';

export type SignInMethodApiErrors =
  | 'InvalidSignInMethod'
  | 'UserAlreadyHasSignInMethod'
  | 'PasswordTooWeak'
  | 'PasswordTooLong'
  | 'InvalidCredentials'
  | 'InvalidRefreshToken'
  | 'RefreshTokenUserIdMismatch';

export type ErrorCode =
  | 'UnknownError'
  | AuthenticationErrors
  | UserApiErrors
  | SignInMethodApiErrors;

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
    };
  }
}

// Authentication specific errors
export class InvalidCredentialsError extends ControllerError {
  constructor(message: string = 'Invalid credentials', data?: any) {
    super(401, 'InvalidCredentials', message, data);
  }
}

export class InvalidRefreshTokenError extends ControllerError {
  constructor(message: string = 'Invalid refresh token', data?: any) {
    super(401, 'InvalidRefreshToken', message, data);
  }
}

export class ExpiredAuthTokenError extends ControllerError {
  constructor(message: string = 'Authentication token expired', data?: any) {
    super(401, 'ExpiredAuthToken', message, data);
  }
}

// User specific errors
export class UserNotFoundError extends ControllerError {
  constructor(message: string = 'User not found', data?: any) {
    super(404, 'UserNotFound', message, data);
  }
}
