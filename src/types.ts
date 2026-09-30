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

export const DEFAULT_LEGAL_CATEGORIES: LegalCategory[] = [
  { id: 'cat-customs', name: 'جمارك', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-income-tax', name: 'ضريبة دخل', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-vat', name: 'ضريبة قيمة مضافة', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-money-laundering', name: 'قانون غسيل الاموال', isDefault: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-labor', name: 'العمل', isDefault: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-standards', name: 'المواصفات والمقاييس', isDefault: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-companies', name: 'الشركات', isDefault: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-cma', name: 'هيئة سوق راس المال', isDefault: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-associations', name: 'جمعيات', isDefault: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-investment', name: 'تشجيع الاستثمار', isDefault: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-auditing', name: 'تدقيق الحسابات', isDefault: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-solar', name: 'الطاقة الشمسية', isDefault: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-automotive', name: 'السيارات', isDefault: false, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-other', name: 'أخرى', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
];

export interface Law {
  id: string;
  title: string;
  category: LawCategory;
  content: string;
  summary?: string;
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

export interface CitationSource {
  id?: string;
  lawId?: string;
  lawTitle: string;
  articleNumber?: string;
  sectionHeader?: string;
  sourceFileName?: string;
  category?: string;
  originalText: string;
  snippet?: string;
  matchScore?: number;
}

export interface AttachedDocumentInfo {
  fileName: string;
  fileSizeFormatted: string;
  numPages: number;
  wordCount: number;
  isOcr: boolean;
  method?: string;
  extractedSnippet?: string;
  fullExtractedText?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  sources?: string[];
  citations?: CitationSource[];
  isLegal?: boolean;
  queryType?: 'legal' | 'general';
  suggestedDetails?: string[];
  attachedDoc?: AttachedDocumentInfo;
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

  // Chatbot Logo & Emblem in Hero Section
  chatbotLogoUrl?: string;
  chatbotLogoType?: 'preset' | 'url' | 'upload';
  chatbotName?: string;
  chatbotBadge?: string;
  showChatbotLogoInHero?: boolean;
  chatbotLogoShape?: 'horizontal' | 'square' | 'auto' | 'compact';
  chatbotLogoWidth?: 'compact' | 'medium' | 'wide' | 'extrawide' | 'full';
  chatbotLogoBgStyle?: 'light-card' | 'transparent' | 'glass-dark' | 'glow';
  chatbotLogoPadding?: 'none' | 'compact' | 'normal' | 'generous';
  
  // Auth Portal Dynamic Texts
  authPortalHeaderTop?: string;
  authPortalHeaderBottom?: string;
  authPortalTitle?: string;
  authPortalSubtitle?: string;
  authPortalDescription?: string;
  authPortalFeature1?: string;
  authPortalFeature2?: string;
  authPortalFeature3?: string;

  // Subscription Plans Section Customization
  plansSectionBadge?: string;
  plansSectionTitle?: string;
  plansSectionSubtitle?: string;
  showPlansSectionInLanding?: boolean;

  // Footer Customization (تخصيص الفوتر أسفل المنصة)
  footerText?: string;
  footerSubtext?: string;
  footerCopyright?: string;
  footerShowScaleIcon?: boolean;
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


export interface Video {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  order?: number;
  isActive?: boolean;
  createdAt: string;
}
