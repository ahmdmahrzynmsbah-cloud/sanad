export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  username: string;
  fullName?: string;
  phone?: string;
  role: 'user' | 'admin';
  status: UserStatus;
  createdAt: string;
  reviewedAt?: string;
}

export type LawCategory = string;

export interface LegalCategory {
  id: string;
  name: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface Law {
  id: string;
  title: string;
  category: LawCategory;
  content: string;
  sourceFileName?: string;
  sourceFileSize?: string;
  pageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  sources?: string[];
}
