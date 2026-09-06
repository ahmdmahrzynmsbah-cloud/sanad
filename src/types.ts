export type UserStatus = 'pending' | 'approved' | 'rejected' | 'frozen';

export type SubscriptionStatus = 'trial' | 'active' | 'frozen';

export interface User {
  id: string;
  username: string;
  fullName?: string;
  phone?: string;
  password?: string;
  recoveryCode?: string;
  role: 'user' | 'admin';
  status: UserStatus;
  createdAt: string;
  reviewedAt?: string;

  // Trial & Subscription Management
  subscriptionStatus?: SubscriptionStatus;
  trialDays?: number;
  trialStartedAt?: string;
  trialEndsAt?: string;
  isSubscribed?: boolean;
  subscriptionPlan?: string;
  subscribedAt?: string;
  isFrozen?: boolean;
  frozenAt?: string;
  freezeReason?: string;
  remainingTrialDays?: number;
  remainingTrialHours?: number;
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

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface FounderInfo {
  name: string;
  title: string;
  bio: string;
  photoUrl: string;
  quote?: string;
  siteOverview: string;
}

export interface Supervisor {
  id: string;
  name: string;
  title: string;
  bio: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  department?: string;
  order?: number;
  createdAt: string;
}

export interface RelatedSite {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  iconType?: string;
  isOfficial?: boolean;
  order?: number;
  createdAt: string;
}

export interface Partner {
  id: string;
  name: string;
  description: string;
  category: string;
  partnershipType?: string;
  logoUrl?: string;
  websiteUrl?: string;
  order?: number;
  isActive?: boolean;
  createdAt: string;
}

export interface AboutSectionCard {
  id: string;
  title: string;
  content: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface PlatformAboutData {
  overviewTitle?: string;
  overviewContent: string;
  visionTitle?: string;
  visionContent: string;
  missionTitle?: string;
  missionContent: string;
  customSections?: AboutSectionCard[];
  updatedAt?: string;
}

export interface SystemBranding {
  systemName: string;
  systemSubtitle?: string;
  systemBadge?: string;
  logoType: 'preset' | 'url' | 'upload';
  logoPreset: string;
  logoUrl?: string;
  logoAccentColor?: string;
  founder?: FounderInfo;
  founderName?: string;
  founderTitle?: string;
  founderBio?: string;
  founderPhotoUrl?: string;
  founderQuote?: string;
  siteOverview?: string;
}

export interface ContactWhatsappItem {
  id: string;
  name: string;
  number: string;
  description?: string;
}

export interface ContactPhoneItem {
  id: string;
  name: string;
  number: string;
}

export interface ContactInfo {
  whatsappNumbers: ContactWhatsappItem[];
  email: string;
  secondaryEmail?: string;
  phoneNumbers?: ContactPhoneItem[];
  workHours?: string;
  address?: string;
  notes?: string;
  updatedAt?: string;
}

