export interface HealthStatusResponse {
  status: 'ok';
}

export interface ApiErrorResponse {
  status: 'error';
  message: string;
  code?: string;
  errors?: unknown[];
}

export * from './mentor.types';
export * from './scheduling.types';
