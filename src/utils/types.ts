// Shared types for the DbTwig transport and server functions.

export type ServerResponseT<T = Record<string, unknown>> = {
  jsonData: T;
  ok: boolean;
  httpStatus: number;
};

export type UserSessionT = {
  sessionId: string;
  sessionStatus: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  emailAddress: string | null;
  errorMessage?: string;
};

export type SessionSummaryT = {
  displayName: string;
  emailAddress: string | null;
  signedInAt: string;
};

export type SessionCookieT = {
  sessionId: string;
  displayName: string;
  emailAddress: string | null;
  signedInAt: string;
};
