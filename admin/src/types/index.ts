export type Role = 'owner' | 'manager' | 'cashier';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  status: UserStatus;
  business: string;
  joinDate: string;
  email?: string;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GetUsersParams {
  search?: string;
  status?: UserStatus | 'all';
  role?: Role | 'all';
  page?: number;
  pageSize?: number;
}
