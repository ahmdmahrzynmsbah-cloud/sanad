export type UserStatus = 'pending' | 'approved' | 'rejected' | 'frozen';

export type SubscriptionStatus = 'trial' | 'active' | 'frozen';

export interface User {
  id: string;
  username: string;
  fullName?: string;
  phone?: string;
  password?: string;
  recoveryCode?: string;
  role: 'user' | 'admin' | 'supervisor';
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

export interface SubscriptionPlan {
  id: string;
  name: string;
  badge?: string;
  price: number | string;
  currency?: string;
  billingPeriod: string;
  description: string;
  features: string[];
  notIncludedFeatures?: string[];
  isPopular?: boolean;
  buttonText?: string;
  buttonActionType?: 'register' | 'contact' | 'whatsapp' | 'custom_url';
  buttonLink?: string;
  whatsappCustomMessage?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
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

export interface LawRequest {
  id: string;
  title: string;
  category: string;
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
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
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
  
  // Auth Portal Dynamic Texts
  authPortalHeaderTop?: string;
  authPortalHeaderBottom?: string;
  authPortalTitle?: string;
  authPortalSubtitle?: string;
  authPortalDescription?: string;
  authPortalFeature1?: string;
  authPortalFeature2?: string;
  authPortalFeature3?: string;
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

