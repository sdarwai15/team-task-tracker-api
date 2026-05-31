import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
  orgId: string;
  exp: number;
  iat?: number;
}

// Standard paginated response shape
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Standard API response shape
export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data?: T;
}
