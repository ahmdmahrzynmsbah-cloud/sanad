import { User } from '../types';

export interface LawRequestItem {
  id: string;
  title: string;
  category?: string;
  content: string;
  description?: string;
  sourceFileName?: string;
  sourceFileSize?: string;
  pageCount?: number;
  userId?: string;
  userName?: string;
  userFullName?: string;
  userPhone?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export const SEED_USERS: User[] = [];

// Clean empty law requests list; real user submissions only
export const SEED_LAW_REQUESTS: LawRequestItem[] = [];

export interface SeedSupervisor {
  id: string;
  name: string;
  title: string;
  bio: string;
  photoUrl: string;
  email: string;
  phone: string;
  department: string;
  order: number;
  createdAt: string;
}

export const SEED_SUPERVISORS: SeedSupervisor[] = [];
