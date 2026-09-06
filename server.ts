import express from 'express';
import path from 'path';
import fs from 'fs';
// Vite is dynamically imported in local dev mode
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  initFirestore,
  fetchUsersFromFirestore,
  fetchLawsFromFirestore,
  fetchCategoriesFromFirestore,
  saveUserToFirestore,
  updateUserInFirestore,
  deleteUserFromFirestore,
  saveLawToFirestore,
  updateLawInFirestore,
  deleteLawFromFirestore,
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  seedFirestoreIfEmpty,
  fetchSettingsFromFirestore,
  saveSettingsToFirestore,
  fetchSupervisorsFromFirestore,
  saveSupervisorToFirestore,
  deleteSupervisorFromFirestore,
  fetchRelatedSitesFromFirestore,
  saveRelatedSiteToFirestore,
  deleteRelatedSiteFromFirestore,
  fetchPartnersFromFirestore,
  savePartnerToFirestore,
  deletePartnerFromFirestore,
  StoredPartner,
  DEFAULT_PARTNERS,
  fetchPlatformAboutFromFirestore,
  savePlatformAboutToFirestore,
  StoredAboutCard,
  StoredPlatformAbout,
  DEFAULT_PLATFORM_ABOUT,
  fetchContactInfoFromFirestore,
  saveContactInfoToFirestore,
  StoredContactInfo,
  StoredContactWhatsappItem,
  StoredContactPhoneItem,
  DEFAULT_CONTACT_INFO,
  fetchConversationsFromFirestore,
  saveConversationToFirestore,
  deleteConversationFromFirestore,
  clearUserConversationsFromFirestore,
  StoredConversation,
  onDatabaseChange,
} from './server/firestore';

dotenv.config();

const app = express();
const PORT = 3000;


// --- Vercel & Firebase Sync Middleware ---
let syncPromise = null;
let lastSyncTime = 0;

async function ensureDbSynced() {
  const now = Date.now();
  // Always sync on cold start. On Vercel, refresh if older than 5 seconds to prevent stale memory.
  const isStale = process.env.VERCEL ? (now - lastSyncTime > 5000) : (lastSyncTime === 0);
  
  if (!syncPromise || isStale) {
    syncPromise = syncWithFirestore().then(() => {
      lastSyncTime = Date.now();
    }).catch(err => {
      console.error("Sync failed:", err);
      syncPromise = null; 
    });
  }
  await syncPromise;
}

app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/') && req.path !== '/api/admin/login') {
    await ensureDbSynced();
  }
  next();
});

// ----------------------------------------
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Global body parser error handler (prevents unhandled PayloadTooLargeError HTML responses)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      error: 'حجم الملف أو البيانات المرسلة كبير جداً. الحد الأقصى المسموح به هو 50 ميجابايت.',
    });
  }
  next(err);
});

// SSE Sync Endpoint for Realtime Client Updates
const syncClients = new Set<express.Response>();

app.get('/api/sync', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  syncClients.add(res);
  
  req.on('close', () => {
    syncClients.delete(res);
  });
});

// Broadcast changes from Firestore to connected SSE clients
onDatabaseChange((collectionName) => {
  syncClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ type: 'update', collection: collectionName })}\n\n`);
  });
});

// Path to JSON database
const DATA_DIR = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Interface for DB
interface StoredUser {
  id: string;
  username: string;
  password: string;
  fullName?: string;
  phone?: string;
  recoveryCode?: string;
  role: 'user' | 'admin';
  status: 'pending' | 'approved' | 'rejected' | 'frozen';
  createdAt: string;
  reviewedAt?: string;

  // Subscription & Trial policy
  subscriptionStatus?: 'trial' | 'active' | 'frozen';
  trialDays?: number;
  trialStartedAt?: string;
  trialEndsAt?: string;
  isSubscribed?: boolean;
  subscriptionPlan?: string;
  subscribedAt?: string;
  frozenAt?: string;
  freezeReason?: string;
  remainingTrialDays?: number;
  remainingTrialHours?: number;
}

interface StoredCategory {
  id: string;
  name: string;
  isDefault?: boolean;
  createdAt: string;
}

const DEFAULT_CATEGORIES: StoredCategory[] = [
  { id: 'cat-customs', name: 'جمارك', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-income-tax', name: 'ضريبة دخل', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-vat', name: 'ضريبة قيمة مضافة', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-other', name: 'أخرى', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z' },
];

interface StoredLaw {
  id: string;
  title: string;
  category: string;
  content: string;
  sourceFileName?: string;
  sourceFileSize?: string;
  pageCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface DBSettings {
  autoApproveNewUsers: boolean;
  defaultTrialDays: number;
  trialPolicyEnabled?: boolean;
  systemName?: string;
  systemSubtitle?: string;
  systemBadge?: string;
  logoType?: 'preset' | 'url' | 'upload';
  logoPreset?: string;
  logoUrl?: string;
  logoAccentColor?: string;

  // Founder Info & Site Overview
  founderName?: string;
  founderTitle?: string;
  founderBio?: string;
  founderPhotoUrl?: string;
  founderQuote?: string;
  siteOverview?: string;
}

const DEFAULT_FOUNDER = {
  founderName: 'المستشار القانوني أ. محمد ناصر خليل',
  founderTitle: 'مستشار السياسات الجمركية والتشريعات الضريبية',
  founderBio: 'خبير ومستشار قانوني وتشريعي متخصص في النظم الجمركية والضريبية الفلسطينية وقوانين تشجيع الاستثمار. أسهم في صياغة ومراجعة العديد من مشاريع القرارات بقوانين واللوائح التنفيذية ومذكرات الاستئناف لدى المحاكم الجمركية والضريبية. بادر بتأسيس وتطوير هذه المنصة الرقمية الذكية لتكون مرجعاً موثقاً وحصناً قانونياً يُمكّن التجار والمكلفين والمستوردين والمواطنين من الإلمام بحقوقهم والتزاماتهم وحوافزهم التشريعية بوضوح وشفافية ودقة متناهية.',
  founderPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
  founderQuote: '«الوعي بالقانون والتشريع الضريبي والجمركي هو أولى ركائز العدالة الاقتصادية وبناء دولة المؤسسات وسيادة القانون.»',
  siteOverview: 'منصة المساعد الجمركي والضريبي هي أول منظومة وطنية ذكية متخصصة تعتمد على الذكاء الاصطناعي المعزز بالنصوص القانونية والقرارات بقانون المعمول بها في دولة فلسطين (مثل قانون الجمارك والمكوس رقم (1) لسنة 1962م وتعديلاته، وقرار بقانون رقم (8) لسنة 2011م بشأن ضريبة الدخل وتعديلاته، وقانون ضريبة القيمة المضافة)، لتقديم إجابات قانونية واستشارات موثقة ودقيقة للمكلفين، التجار، المستوردين، والمواطنين على مدار الساعة.',
};

const DEFAULT_BRANDING = {
  systemName: 'مساعد الجمارك والضرائب',
  systemSubtitle: 'دولة فلسطين • وزارة المالية • الإدارة العامة للجمارك وضريبة الدخل',
  systemBadge: 'فلسطين',
  logoType: 'preset' as const,
  logoPreset: 'scale',
  logoUrl: '',
  logoAccentColor: '#d4af37',
  ...DEFAULT_FOUNDER,
};

export interface StoredSupervisor {
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

export const DEFAULT_SUPERVISORS: StoredSupervisor[] = [
  {
    id: 'sup-1',
    name: 'د. خليل إبراهيم شحادة',
    title: 'رئيس هيئة الإشراف القانوني والضريبي',
    bio: 'دكتوراه في القانون المالي والتشريعات الضريبية المقارنة. أستاذ جامعي ومستشار قانوني معتمد، متخصص في صياغة اللوائح الضريبية والطعون الاستئنافية والسياسات المالية العامة.',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    email: 'k.shehada@pal-tax.ps',
    phone: '+970 59 911 2233',
    department: 'الهيئة التشريعية والسياسات المالية',
    order: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sup-2',
    name: 'أ. سمر كمال التميمي',
    title: 'مشرفة المنازعات الجمركية والتعريفة الموحدة',
    bio: 'ماجستير في قانون التجارة الدولية. متخصصة في جداول التعريفة الجمركية المنسقة، قواعد المنشأ، إجراءات التخليص الجمركي، وحل منازعات التقييم في الموانئ والمعابر.',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80',
    email: 's.tamimi@pal-tax.ps',
    phone: '+970 59 922 3344',
    department: 'إدارة الرقابة والتعريفة الجمركية',
    order: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sup-3',
    name: 'أ. رمزي عبد الهادي عساف',
    title: 'مشرف الامتثال الضريبي والضريبة المضافة',
    bio: 'محاسب قانوني ومستشار ضرائب معتمد. خبير في الفحص والتدقيق الميداني، إعداد الدفاتر المحاسبية القانونية، وإقرارات المقاصة وضريبة القيمة المضافة وخصم المصدر.',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
    email: 'r.assaf@pal-tax.ps',
    phone: '+970 59 933 4455',
    department: 'لجنة الفحص والامتثال الضريبي',
    order: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export interface StoredRelatedSite {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  iconType?: string;
  isOfficial?: boolean;
  createdAt: string;
}

export const DEFAULT_RELATED_SITES: StoredRelatedSite[] = [
  {
    id: 'site-1',
    title: 'وزارة المالية الفلسطينية',
    description: 'البوابة الرسمية لوزارة المالية لمتابعة الموازنة العامة، القرارات الوزارية، النشرات المالية، وإصدارات السياسات الضريبية.',
    url: 'https://www.pmof.ps',
    category: 'وزارات ومؤسسات حكومية',
    iconType: 'landmark',
    isOfficial: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'site-2',
    title: 'الإدارة العامة للجمارك وضريبة القيمة المضافة',
    description: 'المنصة الرسمية للإدارة العامة للجمارك والمكوس وضريبة القيمة المضافة - متابعة الإجراءات الجمركية ونماذج المقاصة والبيانات الجمركية.',
    url: 'https://customs.pmof.ps',
    category: 'جمارك واستيراد',
    iconType: 'scale',
    isOfficial: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'site-3',
    title: 'ديوان الفتوى والتشريع (الجريدة الرسمية - الوقائع الفلسطينية)',
    description: 'المرجع الدستوري والتشريعي المعتمد لكافة القوانين، والقرارات بقانون، والمراسيم الرئاسية، واللوائح التنفيذية الصادرة في فلسطين.',
    url: 'http://www.diwan.ps',
    category: 'تشريعات وقوانين',
    iconType: 'file-text',
    isOfficial: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'site-4',
    title: 'مجلس القضاء الأعلى والمحاكم الفلسطينية',
    description: 'الموقع الرسمي للمحاكم الفلسطينية للاطلاع على قرارات محكمة استئناف قضايا الجمارك والطعون الضريبية وأحكام محكمة النقض.',
    url: 'https://courts.gov.ps',
    category: 'قضاء وعدالة',
    iconType: 'shield',
    isOfficial: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'site-5',
    title: 'سلطة النقد الفلسطينية',
    description: 'البنك المركزي والمشرف على استقرار الجهاز المصرفي الفلسطيني، نشرات أسعار صرف العملات، وتعليمات فتح الاعتمادات المستندية للتجارة.',
    url: 'https://www.pma.ps',
    category: 'خدمات مالية ومصرفية',
    iconType: 'landmark',
    isOfficial: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'site-6',
    title: 'هيئة تشجيع الاستثمار والمدن الصناعية (IPIPA)',
    description: 'بوابة الحوافز الاستثمارية والإعفاءات الضريبية والجمركية المنصوص عليها بموجب قانون تشجيع الاستثمار للمشاريع الريادية والمصانع.',
    url: 'https://www.pipa.ps',
    category: 'استثمار وتنمية',
    iconType: 'globe',
    isOfficial: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

interface DBData {
  users: StoredUser[];
  laws: StoredLaw[];
  categories?: StoredCategory[];
  settings?: DBSettings;
  supervisors?: StoredSupervisor[];
  relatedSites?: StoredRelatedSite[];
  partners?: StoredPartner[];
  platformAbout?: StoredPlatformAbout;
  contactInfo?: StoredContactInfo;
  conversations?: StoredConversation[];
}

const INITIAL_LAWS: StoredLaw[] = [
  {
    id: 'law-1',
    title: 'قرار بقانون رقم (8) لسنة 2011م بشأن ضريبة الدخل وتعديلاته',
    category: 'ضريبة دخل',
    content: `المادة (13) - الإعفاءات السنوية للشخص الطبيعي:
1. يُمنح الشخص الطبيعي المقيم إعفاءً سنوياً أساسياً قدره (36,000) ستة وثلاثون ألف شيكل من دخله الإجمالي الخاضع للضريبة.
2. يُمنح إعفاء إضافي بمقدار المساهمة الفعلية في صناديق التقاعد أو التأمين الصحي المعتمدة وفقاً للحدود القانونية.

المادة (18) - الشرائح الضريبية السنوية للأفراد (تُطبق على الدخل الصافي بعد خصم الإعفاءات القانونية):
تُفرض ضريبة الدخل السنوية على دخول الأفراد الخاضعة للضريبة وفق النسب التصاعدية التالية:
- الشريحة الأولى: من 1 شيكل إلى 75,000 شيكل سنوياً تُفرض بنسبة 5%.
- الشريحة الثانية: من 75,001 شيكل إلى 150,000 شيكل سنوياً تُفرض بنسبة 10%.
- الشريحة الثالثة: ما زاد عن 150,000 شيكل سنوياً تُفرض بنسبة 15%.

المادة (21) - ضريبة دخل الشركات:
تُفرض ضريبة الدخل على صافي الأرباح السنوية للشركات المساهمة والمحدودة الخاضعة للضريبة بنسبة ثابتة قدرها 15%.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'law-2',
    title: 'قانون وتعليمات ضريبة القيمة المضافة النافذة في فلسطين',
    category: 'ضريبة قيمة مضافة',
    content: `المادة (4) - النسبة العامة للضريبة:
تُفرض ضريبة القيمة المضافة في فلسطين بنسبة قانونية موحدة قدرها 16% على استيراد وبيع كافة السلع وتقديم الخدمات في الأراضي الفلسطينية.

المادة (7) - السلع المعفاة والسلع الخاضعة لنسبة الصفر:
1. تُعفى تماماً من ضريبة القيمة المضافة السلع والمنتجات الزراعية الطازجة غير المصنعة (الخضروات الطازجة، الفواكه، بيض المائدة، والحليب الطازج غير المبستر).
2. يخضع طحين القمح والخبز التمويني المدعوم لنسبة الصفر بالمائة (0%) لتخفيف الأعباء المعيشية.
3. الخدمات المالية المصرفية والتأمينات الأساسية معفاة من ضريبة القيمة المضافة مع خضوعها لأحكام الرسوم الخاصة.

المادة (14) - فواتير المقاصة الضريبية:
يتعين على كل مشتغل مرخص تسجيل جميع صفقاته التجارية مع الطرف الآخر عبر إصدار فواتير ضريبية نظامية وفواتير مقاصة معتمدة خلال المهلة القانونية لاسترداد ضريبة المدخلات.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'law-3',
    title: 'لائحة التعرفة والرسوم الجمركية الفلسطينية للطرود البريدية والمركبات',
    category: 'جمارك',
    content: `المادة (2) - الإعفاءات والرسوم على الطرود البريدية الشخصية (التجارة الإلكترونية):
1. الطرود البريدية الشخصية التي تقل قيمتها الإجمالية سيف (CIF - تشمل ثمن السلعة والشحن والتأمين) عن 75 دولاراً أمريكياً (أو ما يعادلها بالشيكل بسعر الصرف الرسمي) معفاة تماماً من الرسوم الجمركية وضريبة القيمة المضافة، شريطة أن تكون للاستخدام الشخصي غير التجاري.
2. الطرود البريدية التي تزيد قيمتها عن 75 دولاراً ولا تتجاوز 500 دولار أمريكي، تُعفى من الرسوم الجمركية لكن تخضع لضريبة القيمة المضافة بنسبة 16% مع رسم تخليص بريدي مقطوع.
3. الطرود والرسائل التي تتجاوز قيمتها 500 دولار أمريكي، تخضع لإجراءات الاستيراد الرسمية وتُفرض عليها الرسوم الجمركية المحددة في جدول التعرفة (بين 5% و15% حسب صنف المادة) بالإضافة لضريبة القيمة المضافة 16%.

المادة (9) - الرسوم والجمارك على استيراد المركبات:
1. سيارات الركوب العادية التي تعمل بالوقود التقليدي (بنزين أو ديزل) حتى سعة 2000 سي سي: تخضع لرسم جمركي بنسبة 50% وضريبة شراء بنسبة 25%، بالإضافة لضريبة القيمة المضافة 16%.
2. السيارات الكهربائية بالكامل: تُشجّع التشريعات الفلسطينية الطاقة النظيفة بتخفيض الرسم الجمركي إلى 10% فقط، مع ضريبة شراء 10% وضريبة قيمة مضافة 16%.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function initDB(): DBData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    // Read-only filesystem in Vercel/Lambda
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(content) as DBData;
      if (!data.settings) {
        data.settings = { autoApproveNewUsers: true, defaultTrialDays: 7, trialPolicyEnabled: true, ...DEFAULT_BRANDING };
      } else {
        if (typeof data.settings.defaultTrialDays !== 'number' || data.settings.defaultTrialDays < 1) {
          data.settings.defaultTrialDays = 7;
        }
        if (typeof data.settings.trialPolicyEnabled !== 'boolean') {
          data.settings.trialPolicyEnabled = true;
        }
        if (!data.settings.systemName) data.settings.systemName = DEFAULT_BRANDING.systemName;
        if (!data.settings.systemSubtitle) data.settings.systemSubtitle = DEFAULT_BRANDING.systemSubtitle;
        if (!data.settings.systemBadge) data.settings.systemBadge = DEFAULT_BRANDING.systemBadge;
        if (!data.settings.logoType) data.settings.logoType = DEFAULT_BRANDING.logoType;
        if (!data.settings.logoPreset) data.settings.logoPreset = DEFAULT_BRANDING.logoPreset;
        if (!data.settings.logoAccentColor) data.settings.logoAccentColor = DEFAULT_BRANDING.logoAccentColor;

        if (!data.settings.founderName) data.settings.founderName = DEFAULT_FOUNDER.founderName;
        if (!data.settings.founderTitle) data.settings.founderTitle = DEFAULT_FOUNDER.founderTitle;
        if (!data.settings.founderBio) data.settings.founderBio = DEFAULT_FOUNDER.founderBio;
        if (!data.settings.founderPhotoUrl) data.settings.founderPhotoUrl = DEFAULT_FOUNDER.founderPhotoUrl;
        if (!data.settings.founderQuote) data.settings.founderQuote = DEFAULT_FOUNDER.founderQuote;
        if (!data.settings.siteOverview) data.settings.siteOverview = DEFAULT_FOUNDER.siteOverview;
      }
      if (!data.categories || data.categories.length === 0) {
        data.categories = [...DEFAULT_CATEGORIES];
      }
      if (!data.supervisors || data.supervisors.length === 0) {
        data.supervisors = [...DEFAULT_SUPERVISORS];
      }
      if (!data.relatedSites || data.relatedSites.length === 0) {
        data.relatedSites = [...DEFAULT_RELATED_SITES];
      }
      if (!data.platformAbout) {
        data.platformAbout = { ...DEFAULT_PLATFORM_ABOUT };
      }
      if (!data.contactInfo) {
        data.contactInfo = { ...DEFAULT_CONTACT_INFO };
      }
      return data;
    } catch {
      // Fallback
    }
  }

  const initialData: DBData = {
    settings: {
      autoApproveNewUsers: true,
      defaultTrialDays: 7,
      trialPolicyEnabled: true,
      ...DEFAULT_BRANDING,
    },
    categories: [...DEFAULT_CATEGORIES],
    supervisors: [...DEFAULT_SUPERVISORS],
    relatedSites: [...DEFAULT_RELATED_SITES],
    partners: [...DEFAULT_PARTNERS],
    platformAbout: { ...DEFAULT_PLATFORM_ABOUT },
    contactInfo: { ...DEFAULT_CONTACT_INFO },
    users: [],
    laws: INITIAL_LAWS,
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  return initialData;
}

let db = initDB();

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

/**
 * Checks and updates trial expiration and freeze status for a user.
 * If trial has expired and user is not subscribed, account is automatically frozen.
 */
function checkAndUpdateUserTrialStatus(user: StoredUser, persist = true): {
  isFrozen: boolean;
  subscriptionStatus: 'trial' | 'active' | 'frozen';
  remainingDays: number;
  remainingHours: number;
  trialEndsAt?: string;
  message: string;
} {
  // Admin accounts are never restricted
  if (user.role === 'admin') {
    return {
      isFrozen: false,
      subscriptionStatus: 'active',
      remainingDays: 999,
      remainingHours: 999,
      message: 'حساب مسؤول النظام',
    };
  }

  // Pending and rejected accounts keep their state
  if (user.status === 'pending' || user.status === 'rejected') {
    return {
      isFrozen: false,
      subscriptionStatus: user.subscriptionStatus || 'trial',
      remainingDays: 0,
      remainingHours: 0,
      trialEndsAt: user.trialEndsAt,
      message: user.status === 'pending' ? 'الحساب قيد المراجعة الإدارية' : 'الحساب مرفوض',
    };
  }

  // Actively subscribed user
  if (user.isSubscribed) {
    user.subscriptionStatus = 'active';
    user.status = 'approved';
    return {
      isFrozen: false,
      subscriptionStatus: 'active',
      remainingDays: 999,
      remainingHours: 999,
      message: 'اشتراك معتمد ونشط',
    };
  }

  // If already explicitly marked as frozen
  if (user.status === 'frozen' || user.subscriptionStatus === 'frozen') {
    return {
      isFrozen: true,
      subscriptionStatus: 'frozen',
      remainingDays: 0,
      remainingHours: 0,
      trialEndsAt: user.trialEndsAt,
      message: user.freezeReason || 'الحساب مجمد لانتهاء الفترة التجريبية المحددة دون اشتراك',
    };
  }

  // Ensure user has a valid trialEndsAt
  const defaultDays = db.settings?.defaultTrialDays || 7;
  if (!user.trialEndsAt) {
    const createdTime = user.createdAt ? new Date(user.createdAt).getTime() : Date.now();
    const trialDays = typeof user.trialDays === 'number' && user.trialDays > 0 ? user.trialDays : defaultDays;
    user.trialDays = trialDays;
    user.trialStartedAt = user.createdAt || new Date().toISOString();
    user.trialEndsAt = new Date(createdTime + trialDays * 24 * 60 * 60 * 1000).toISOString();
  }

  const now = Date.now();
  const trialEndTime = new Date(user.trialEndsAt).getTime();

  if (now >= trialEndTime) {
    // Trial expired! Freeze account automatically
    user.status = 'frozen';
    user.subscriptionStatus = 'frozen';
    user.frozenAt = user.frozenAt || new Date().toISOString();
    user.freezeReason = 'انتهت الفترة التجريبية المحددة للحساب دون تفعيل الاشتراك';

    if (persist) {
      saveDB();
      updateUserInFirestore(user.id, {
        status: 'frozen',
        subscriptionStatus: 'frozen',
        frozenAt: user.frozenAt,
        freezeReason: user.freezeReason,
      }).catch((e) => console.error(`Failed to sync auto-freeze to Firestore for ${user.id}:`, e));
    }

    return {
      isFrozen: true,
      subscriptionStatus: 'frozen',
      remainingDays: 0,
      remainingHours: 0,
      trialEndsAt: user.trialEndsAt,
      message: 'انتهت الفترة التجريبية لحسابك. تم تجميد الحساب لحين الاشتراك.',
    };
  }

  // Active trial calculation
  const diffMs = trialEndTime - now;
  const remainingDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const remainingHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  user.subscriptionStatus = 'trial';
  user.status = 'approved';
  user.remainingTrialDays = remainingDays;
  user.remainingTrialHours = remainingHours;

  return {
    isFrozen: false,
    subscriptionStatus: 'trial',
    remainingDays,
    remainingHours,
    trialEndsAt: user.trialEndsAt,
    message: `فترة تجريبية سارية: متبقي ${remainingDays} يوم و ${remainingHours} ساعة`,
  };
}

/**
 * Returns full user object for admin view with credentials and real-time trial calculation
 */
function toAdminUser(user: StoredUser) {
  const trialInfo = checkAndUpdateUserTrialStatus(user, false);
  return {
    ...user,
    status: user.status,
    subscriptionStatus: trialInfo.subscriptionStatus,
    remainingTrialDays: trialInfo.remainingDays,
    remainingTrialHours: trialInfo.remainingHours,
    isFrozen: trialInfo.isFrozen,
    trialEndsAt: user.trialEndsAt,
    isSubscribed: Boolean(user.isSubscribed),
  };
}

/**
 * Returns user object stripped of sensitive fields with real-time trial calculation
 */
function toSafeUser(user: StoredUser) {
  const trialInfo = checkAndUpdateUserTrialStatus(user, false);
  const { password, recoveryCode, ...rest } = user;
  return {
    ...rest,
    status: user.status,
    subscriptionStatus: trialInfo.subscriptionStatus,
    remainingTrialDays: trialInfo.remainingDays,
    remainingTrialHours: trialInfo.remainingHours,
    isFrozen: trialInfo.isFrozen,
    trialEndsAt: user.trialEndsAt,
    isSubscribed: Boolean(user.isSubscribed),
  };
}

async function syncWithFirestore() {
  try {
    console.log('🔄 Initializing Cloud Firestore sync in background...');
    initFirestore();
    if (!db.categories || db.categories.length === 0) {
      db.categories = [...DEFAULT_CATEGORIES];
    }
    if (!db.supervisors || db.supervisors.length === 0) {
      db.supervisors = [...DEFAULT_SUPERVISORS];
    }
    if (!db.relatedSites || db.relatedSites.length === 0) {
      db.relatedSites = [...DEFAULT_RELATED_SITES];
    }
    if (!db.partners || db.partners.length === 0) {
      db.partners = [...DEFAULT_PARTNERS];
    }
    await seedFirestoreIfEmpty(db.users, db.laws, db.categories, db.supervisors, db.relatedSites, db.partners);

    // Fetch users, laws, categories, settings, supervisors, related sites, partners, platform about, and contact concurrently in parallel
    const [cloudUsers, cloudLaws, cloudCategories, cloudSettings, cloudSupervisors, cloudRelatedSites, cloudPartners, cloudAbout, cloudContact] = await Promise.all([
      fetchUsersFromFirestore(),
      fetchLawsFromFirestore(),
      fetchCategoriesFromFirestore(),
      fetchSettingsFromFirestore(),
      fetchSupervisorsFromFirestore(),
      fetchRelatedSitesFromFirestore(),
      fetchPartnersFromFirestore(),
      fetchPlatformAboutFromFirestore(),
      fetchContactInfoFromFirestore(),
    ]);

    let changed = false;

    if (cloudContact) {
      db.contactInfo = cloudContact;
      changed = true;
      console.log('✅ Loaded contact info from Cloud Firestore.');
    } else if (db.contactInfo) {
      saveContactInfoToFirestore(db.contactInfo).catch((e) => console.error('Error saving initial contact info to Firestore:', e));
    }

    if (cloudAbout) {
      if (cloudAbout.customSections) {
        cloudAbout.customSections = cloudAbout.customSections.filter(
          (sec) => sec.id !== 'sec-goals' && sec.id !== 'sec-values'
        );
      }
      db.platformAbout = cloudAbout;
      changed = true;
      console.log('✅ Loaded platform about content from Cloud Firestore.');
    } else if (db.platformAbout) {
      savePlatformAboutToFirestore(db.platformAbout).catch((e) => console.error('Error saving initial platform about to Firestore:', e));
    }

    if (cloudSettings) {
      db.settings = {
        autoApproveNewUsers: cloudSettings.autoApproveNewUsers !== false,
        defaultTrialDays: typeof cloudSettings.defaultTrialDays === 'number' ? cloudSettings.defaultTrialDays : 7,
        trialPolicyEnabled: cloudSettings.trialPolicyEnabled !== false,
        systemName: cloudSettings.systemName || db.settings?.systemName || DEFAULT_BRANDING.systemName,
        systemSubtitle: cloudSettings.systemSubtitle || db.settings?.systemSubtitle || DEFAULT_BRANDING.systemSubtitle,
        systemBadge: cloudSettings.systemBadge || db.settings?.systemBadge || DEFAULT_BRANDING.systemBadge,
        logoType: cloudSettings.logoType || db.settings?.logoType || DEFAULT_BRANDING.logoType,
        logoPreset: cloudSettings.logoPreset || db.settings?.logoPreset || DEFAULT_BRANDING.logoPreset,
        logoUrl: cloudSettings.logoUrl !== undefined ? cloudSettings.logoUrl : (db.settings?.logoUrl || ''),
        logoAccentColor: cloudSettings.logoAccentColor || db.settings?.logoAccentColor || DEFAULT_BRANDING.logoAccentColor,

        founderName: cloudSettings.founderName || db.settings?.founderName || DEFAULT_FOUNDER.founderName,
        founderTitle: cloudSettings.founderTitle || db.settings?.founderTitle || DEFAULT_FOUNDER.founderTitle,
        founderBio: cloudSettings.founderBio || db.settings?.founderBio || DEFAULT_FOUNDER.founderBio,
        founderPhotoUrl: cloudSettings.founderPhotoUrl !== undefined ? cloudSettings.founderPhotoUrl : (db.settings?.founderPhotoUrl || DEFAULT_FOUNDER.founderPhotoUrl),
        founderQuote: cloudSettings.founderQuote || db.settings?.founderQuote || DEFAULT_FOUNDER.founderQuote,
        siteOverview: cloudSettings.siteOverview || db.settings?.siteOverview || DEFAULT_FOUNDER.siteOverview,
      };
      changed = true;
      console.log(`✅ Loaded settings from Cloud Firestore (Default trial: ${db.settings.defaultTrialDays} days, System: "${db.settings.systemName}").`);
    } else if (db.settings) {
      saveSettingsToFirestore({
        autoApproveNewUsers: db.settings.autoApproveNewUsers !== false,
        defaultTrialDays: db.settings.defaultTrialDays || 7,
        trialPolicyEnabled: true,
        systemName: db.settings.systemName || DEFAULT_BRANDING.systemName,
        systemSubtitle: db.settings.systemSubtitle || DEFAULT_BRANDING.systemSubtitle,
        systemBadge: db.settings.systemBadge || DEFAULT_BRANDING.systemBadge,
        logoType: db.settings.logoType || DEFAULT_BRANDING.logoType,
        logoPreset: db.settings.logoPreset || DEFAULT_BRANDING.logoPreset,
        logoUrl: db.settings.logoUrl || '',
        logoAccentColor: db.settings.logoAccentColor || DEFAULT_BRANDING.logoAccentColor,
        founderName: db.settings.founderName || DEFAULT_FOUNDER.founderName,
        founderTitle: db.settings.founderTitle || DEFAULT_FOUNDER.founderTitle,
        founderBio: db.settings.founderBio || DEFAULT_FOUNDER.founderBio,
        founderPhotoUrl: db.settings.founderPhotoUrl || DEFAULT_FOUNDER.founderPhotoUrl,
        founderQuote: db.settings.founderQuote || DEFAULT_FOUNDER.founderQuote,
        siteOverview: db.settings.siteOverview || DEFAULT_FOUNDER.siteOverview,
      }).catch((e) => console.error('Error saving initial settings to Firestore:', e));
    }

    if (cloudUsers) {
      db.users = cloudUsers;
      changed = true;
      console.log(`✅ Loaded ${cloudUsers.length} users from Cloud Firestore.`);
    }

    // Run trial expiration checks on all users
    for (const u of db.users) {
      checkAndUpdateUserTrialStatus(u, false);
    }

    if (cloudLaws && cloudLaws.length > 0) {
      db.laws = cloudLaws;
      changed = true;
      console.log(`✅ Loaded ${cloudLaws.length} laws from Cloud Firestore.`);
    }

    if (cloudCategories && cloudCategories.length > 0) {
      db.categories = cloudCategories;
      changed = true;
      console.log(`✅ Loaded ${cloudCategories.length} categories from Cloud Firestore.`);
    }

    if (cloudSupervisors && cloudSupervisors.length > 0) {
      db.supervisors = cloudSupervisors;
      changed = true;
      console.log(`✅ Loaded ${cloudSupervisors.length} supervisors from Cloud Firestore.`);
    }

    if (cloudRelatedSites && cloudRelatedSites.length > 0) {
      db.relatedSites = cloudRelatedSites;
      changed = true;
      console.log(`✅ Loaded ${cloudRelatedSites.length} related sites from Cloud Firestore.`);
    }

    if (cloudPartners && cloudPartners.length > 0) {
      db.partners = cloudPartners;
      changed = true;
      console.log(`✅ Loaded ${cloudPartners.length} partners from Cloud Firestore.`);
    }

    if (changed) {
      saveDB();
    }
    console.log('⚡ Cloud Firestore synchronization complete.');
  } catch (err) {
    console.error('❌ Error during Cloud Firestore synchronization:', err);
  }
}

// Fixed Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// --- Auth Endpoints ---

// User Registration: New accounts automatically enter "pending" state
app.post('/api/auth/register', async (req, res) => {
  const { username, password, fullName, phone, recoveryCode } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const trimmedUsername = String(username).trim();
  const trimmedFullName = fullName ? String(fullName).trim() : '';
  const trimmedPhone = phone ? String(phone).trim() : '';
  const trimmedRecoveryCode = recoveryCode ? String(recoveryCode).trim() : '';

  if (!trimmedFullName) {
    return res.status(400).json({ error: 'يرجى إدخال الاسم الكامل' });
  }

  if (!trimmedPhone) {
    return res.status(400).json({ error: 'يرجى إدخال رقم الجوال' });
  }

  if (!trimmedRecoveryCode) {
    return res.status(400).json({ error: 'يرجى تحديد رمز استعادة كلمة المرور في حال نسيانها' });
  }

  if (trimmedUsername.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase()) {
    return res.status(400).json({ error: 'اسم المستخدم هذا محجوز لإدارة النظام' });
  }

  const existingUser = db.users.find(
    (u) => u.username.toLowerCase() === trimmedUsername.toLowerCase()
  );
  if (existingUser) {
    return res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل، يرجى اختيار اسم آخر' });
  }

  // Check if phone number is already registered
  if (trimmedPhone) {
    const existingPhone = db.users.find((u) => u.phone && u.phone.trim() === trimmedPhone);
    if (existingPhone) {
      return res.status(400).json({ error: 'رقم الجوال هذا مسجل مسبقاً بحساب آخر' });
    }
  }

  const defaultTrialDays = typeof db.settings?.defaultTrialDays === 'number' ? db.settings.defaultTrialDays : 7;
  const now = new Date();
  const trialStartedAt = now.toISOString();
  const trialEndsAt = new Date(now.getTime() + defaultTrialDays * 24 * 60 * 60 * 1000).toISOString();

  const isAutoApprove = db.settings?.autoApproveNewUsers !== false;
  const newUser: StoredUser = {
    id: 'user-' + Date.now(),
    username: trimmedUsername,
    fullName: trimmedFullName,
    phone: trimmedPhone,
    recoveryCode: trimmedRecoveryCode,
    password: String(password),
    role: 'user',
    status: isAutoApprove ? 'approved' : 'pending',
    createdAt: now.toISOString(),
    ...(isAutoApprove ? { reviewedAt: now.toISOString() } : {}),

    // Trial and Subscription policy
    subscriptionStatus: 'trial',
    trialDays: defaultTrialDays,
    trialStartedAt,
    trialEndsAt,
    isSubscribed: false,
  };

  db.users.push(newUser);
  saveDB();
  await saveUserToFirestore(newUser);

  return res.status(201).json({
    message: isAutoApprove
      ? `تم إنشاء الحساب واعتماده بنجاح! تم منحك فترة تجريبية مجانية لمدة ${defaultTrialDays} أيام لاستخدام مساعد الجمارك والضرائب.`
      : `تم تقديم طلب الحساب بنجاح، وهو قيد المراجعة الإدارية. تم تخصيص فترة تجريبية مدتها ${defaultTrialDays} أيام تبدأ فور الاعتماد.`,
    isAutoApproved: isAutoApprove,
    defaultTrialDays,
    trialEndsAt,
    user: toSafeUser(newUser),
  });
});

// User Login: Checks credentials, approval status, and trial expiration
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم أو رقم الجوال وكلمة المرور' });
  }

  const trimmed = String(username).trim();
  const user = db.users.find(
    (u) =>
      (u.username.toLowerCase() === trimmed.toLowerCase() ||
        (u.phone && u.phone.trim() === trimmed)) &&
      u.password === String(password)
  );

  if (!user) {
    return res.status(401).json({ error: 'بيانات الدخول أو كلمة المرور غير صحيحة' });
  }

  // 1. Check pending status
  if (user.status === 'pending') {
    return res.status(403).json({
      error: 'حسابك قيد المراجعة الإدارية حالياً، ولا يمكنك استخدام البوت إلا بعد موافقة المسؤول.',
      status: 'pending',
      username: user.username,
      fullName: user.fullName,
    });
  }

  // 2. Check rejected status
  if (user.status === 'rejected') {
    return res.status(403).json({
      error: 'تم رفض طلب حسابك من قِبل إدارة النظام. يتعذر تسجيل الدخول.',
      status: 'rejected',
      username: user.username,
      fullName: user.fullName,
    });
  }

  // 3. Real-time trial expiration & freeze check
  const trialCheck = checkAndUpdateUserTrialStatus(user, true);
  if (trialCheck.isFrozen) {
    return res.status(403).json({
      error: 'تم تجميد حسابك لانتهاء الفترة التجريبية المحددة دون اشتراك. يرجى الاشتراك لتفعيل الحساب ومتابعة الاستخدام.',
      status: 'frozen',
      isFrozen: true,
      subscriptionStatus: 'frozen',
      trialEndsAt: user.trialEndsAt,
      username: user.username,
      fullName: user.fullName,
      freezeReason: user.freezeReason || 'انتهاء الفترة التجريبية',
      user: toSafeUser(user),
    });
  }

  return res.json({
    message: 'تم تسجيل الدخول بنجاح',
    user: toSafeUser(user),
  });
});

// Password Reset using recovery code
app.post('/api/auth/reset-password', async (req, res) => {
  const { identifier, recoveryCode, newPassword } = req.body;
  if (!identifier || !recoveryCode || !newPassword) {
    return res.status(400).json({
      error: 'يرجى إدخال اسم المستخدم أو رقم الجوال، ورمز استعادة كلمة المرور، وكلمة المرور الجديدة',
    });
  }

  if (String(newPassword).length < 4) {
    return res.status(400).json({ error: 'يجب ألا تقل كلمة المرور الجديدة عن 4 خانات' });
  }

  const trimmedId = String(identifier).trim().toLowerCase();
  const trimmedCode = String(recoveryCode).trim().toLowerCase();

  const user = db.users.find(
    (u) =>
      u.username.toLowerCase() === trimmedId ||
      (u.phone && u.phone.trim().toLowerCase() === trimmedId)
  );

  if (!user) {
    return res.status(404).json({ error: 'لم يتم العثور على حساب مسجل بهذا الاسم أو رقم الجوال' });
  }

  if (!user.recoveryCode || user.recoveryCode.trim().toLowerCase() !== trimmedCode) {
    return res.status(400).json({ error: 'رمز استعادة كلمة المرور غير صحيح لهذا الحساب' });
  }

  user.password = String(newPassword);
  saveDB();
  await updateUserInFirestore(user.id, { password: user.password });

  return res.json({
    message: 'تم تعيين كلمة المرور الجديدة بنجاح! يمكنك الآن تسجيل الدخول بها.',
  });
});

// Fixed Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
  }

  if (
    username.trim() === ADMIN_CREDENTIALS.username &&
    password === ADMIN_CREDENTIALS.password
  ) {
    return res.json({
      message: 'تم تسجيل دخول المسؤول بنجاح',
      admin: {
        username: ADMIN_CREDENTIALS.username,
        role: 'admin',
      },
    });
  }

  return res.status(401).json({ error: 'بيانات اعتماد المسؤول غير صحيحة' });
});

// Public System Branding & Founder Endpoint
app.get('/api/system/branding', (req, res) => {
  res.json({
    systemName: db.settings?.systemName || DEFAULT_BRANDING.systemName,
    systemSubtitle: db.settings?.systemSubtitle || DEFAULT_BRANDING.systemSubtitle,
    systemBadge: db.settings?.systemBadge || DEFAULT_BRANDING.systemBadge,
    logoType: db.settings?.logoType || DEFAULT_BRANDING.logoType,
    logoPreset: db.settings?.logoPreset || DEFAULT_BRANDING.logoPreset,
    logoUrl: db.settings?.logoUrl || '',
    logoAccentColor: db.settings?.logoAccentColor || DEFAULT_BRANDING.logoAccentColor,

    founderName: db.settings?.founderName || DEFAULT_FOUNDER.founderName,
    founderTitle: db.settings?.founderTitle || DEFAULT_FOUNDER.founderTitle,
    founderBio: db.settings?.founderBio || DEFAULT_FOUNDER.founderBio,
    founderPhotoUrl: db.settings?.founderPhotoUrl || DEFAULT_FOUNDER.founderPhotoUrl,
    founderQuote: db.settings?.founderQuote || DEFAULT_FOUNDER.founderQuote,
    siteOverview: db.settings?.siteOverview || DEFAULT_FOUNDER.siteOverview,
  });
});

// Public Platform About & Vision/Mission Endpoint
app.get('/api/system/about', (req, res) => {
  const about = db.platformAbout || DEFAULT_PLATFORM_ABOUT;
  if (about && about.customSections) {
    about.customSections = about.customSections.filter(
      (sec) => sec.id !== 'sec-goals' && sec.id !== 'sec-values'
    );
  }
  res.json(about);
});

// Public Contact Us Info Endpoint (أرقام الواتساب والبريد للتواصل)
app.get('/api/system/contact', (req, res) => {
  res.json({ contactInfo: db.contactInfo || DEFAULT_CONTACT_INFO });
});

// Fast Consolidated Admin Initial Data (Single roundtrip for ultra-fast portal load)
app.get('/api/admin/init', (req, res) => {
  const safeUsers = db.users.map(toSafeUser);
  res.json({
    users: safeUsers,
    laws: db.laws,
    categories: db.categories || [],
    supervisors: (db.supervisors || []).sort((a, b) => (a.order || 0) - (b.order || 0)),
    relatedSites: db.relatedSites || [],
    platformAbout: db.platformAbout || DEFAULT_PLATFORM_ABOUT,
    contactInfo: db.contactInfo || DEFAULT_CONTACT_INFO,
    autoApprove: db.settings?.autoApproveNewUsers !== false,
    defaultTrialDays: db.settings?.defaultTrialDays || 7,
    trialPolicyEnabled: db.settings?.trialPolicyEnabled !== false,
    branding: {
      systemName: db.settings?.systemName || DEFAULT_BRANDING.systemName,
      systemSubtitle: db.settings?.systemSubtitle || DEFAULT_BRANDING.systemSubtitle,
      systemBadge: db.settings?.systemBadge || DEFAULT_BRANDING.systemBadge,
      logoType: db.settings?.logoType || DEFAULT_BRANDING.logoType,
      logoPreset: db.settings?.logoPreset || DEFAULT_BRANDING.logoPreset,
      logoUrl: db.settings?.logoUrl || '',
      logoAccentColor: db.settings?.logoAccentColor || DEFAULT_BRANDING.logoAccentColor,

      founderName: db.settings?.founderName || DEFAULT_FOUNDER.founderName,
      founderTitle: db.settings?.founderTitle || DEFAULT_FOUNDER.founderTitle,
      founderBio: db.settings?.founderBio || DEFAULT_FOUNDER.founderBio,
      founderPhotoUrl: db.settings?.founderPhotoUrl || DEFAULT_FOUNDER.founderPhotoUrl,
      founderQuote: db.settings?.founderQuote || DEFAULT_FOUNDER.founderQuote,
      siteOverview: db.settings?.siteOverview || DEFAULT_FOUNDER.siteOverview,
    },
    systemStatus: {
      status: 'online',
      database: 'Google Cloud Firestore (Enterprise NoSQL)',
      provider: 'Cloud Firestore',
      projectId: 'pos1-d562e',
      databaseId: 'ai-studio-6d29bd6f-50fc-4475-8e3b-86e0db64d605',
      usersCount: db.users.length,
      lawsCount: db.laws.length,
      categoriesCount: (db.categories || []).length,
      supervisorsCount: (db.supervisors || []).length,
      relatedSitesCount: (db.relatedSites || []).length,
      timestamp: new Date().toISOString(),
    },
  });
});

// --- Admin Endpoints ---

// Get admin settings (Auto-approval status, Trial period & Branding & About & Contact)
app.get('/api/admin/settings', (req, res) => {
  res.json({
    autoApprove: db.settings?.autoApproveNewUsers !== false,
    defaultTrialDays: db.settings?.defaultTrialDays || 7,
    trialPolicyEnabled: db.settings?.trialPolicyEnabled !== false,
    platformAbout: db.platformAbout || DEFAULT_PLATFORM_ABOUT,
    contactInfo: db.contactInfo || DEFAULT_CONTACT_INFO,
    branding: {
      systemName: db.settings?.systemName || DEFAULT_BRANDING.systemName,
      systemSubtitle: db.settings?.systemSubtitle || DEFAULT_BRANDING.systemSubtitle,
      systemBadge: db.settings?.systemBadge || DEFAULT_BRANDING.systemBadge,
      logoType: db.settings?.logoType || DEFAULT_BRANDING.logoType,
      logoPreset: db.settings?.logoPreset || DEFAULT_BRANDING.logoPreset,
      logoUrl: db.settings?.logoUrl || '',
      logoAccentColor: db.settings?.logoAccentColor || DEFAULT_BRANDING.logoAccentColor,

      founderName: db.settings?.founderName || DEFAULT_FOUNDER.founderName,
      founderTitle: db.settings?.founderTitle || DEFAULT_FOUNDER.founderTitle,
      founderBio: db.settings?.founderBio || DEFAULT_FOUNDER.founderBio,
      founderPhotoUrl: db.settings?.founderPhotoUrl || DEFAULT_FOUNDER.founderPhotoUrl,
      founderQuote: db.settings?.founderQuote || DEFAULT_FOUNDER.founderQuote,
      siteOverview: db.settings?.siteOverview || DEFAULT_FOUNDER.siteOverview,
    },
  });
});

// Update System Branding & Founder Profile
app.post('/api/admin/settings/branding', async (req, res) => {
  const {
    systemName,
    systemSubtitle,
    systemBadge,
    logoType,
    logoPreset,
    logoUrl,
    logoAccentColor,
    founderName,
    founderTitle,
    founderBio,
    founderPhotoUrl,
    founderQuote,
    siteOverview,
  } = req.body;

  if (!systemName || !String(systemName).trim()) {
    return res.status(400).json({ error: 'يرجى إدخال اسم صحيح للنظام' });
  }

  if (!db.settings) {
    db.settings = {
      autoApproveNewUsers: true,
      defaultTrialDays: 7,
      trialPolicyEnabled: true,
      ...DEFAULT_BRANDING,
    };
  }

  db.settings.systemName = String(systemName).trim();
  if (systemSubtitle !== undefined) {
    db.settings.systemSubtitle = String(systemSubtitle).trim();
  }
  if (systemBadge !== undefined) {
    db.settings.systemBadge = String(systemBadge).trim();
  }
  db.settings.logoType = logoType === 'url' || logoType === 'upload' ? logoType : 'preset';
  if (logoPreset) {
    db.settings.logoPreset = String(logoPreset).trim();
  }
  if (logoUrl !== undefined) {
    db.settings.logoUrl = String(logoUrl);
  }
  if (logoAccentColor) {
    db.settings.logoAccentColor = String(logoAccentColor).trim();
  }

  if (founderName !== undefined) db.settings.founderName = String(founderName).trim();
  if (founderTitle !== undefined) db.settings.founderTitle = String(founderTitle).trim();
  if (founderBio !== undefined) db.settings.founderBio = String(founderBio).trim();
  if (founderPhotoUrl !== undefined) db.settings.founderPhotoUrl = String(founderPhotoUrl);
  if (founderQuote !== undefined) db.settings.founderQuote = String(founderQuote).trim();
  if (siteOverview !== undefined) db.settings.siteOverview = String(siteOverview).trim();

  saveDB();

  await saveSettingsToFirestore({
    autoApproveNewUsers: db.settings.autoApproveNewUsers !== false,
    defaultTrialDays: db.settings.defaultTrialDays || 7,
    trialPolicyEnabled: true,
    systemName: db.settings.systemName,
    systemSubtitle: db.settings.systemSubtitle,
    systemBadge: db.settings.systemBadge,
    logoType: db.settings.logoType,
    logoPreset: db.settings.logoPreset,
    logoUrl: db.settings.logoUrl,
    logoAccentColor: db.settings.logoAccentColor,

    founderName: db.settings.founderName,
    founderTitle: db.settings.founderTitle,
    founderBio: db.settings.founderBio,
    founderPhotoUrl: db.settings.founderPhotoUrl,
    founderQuote: db.settings.founderQuote,
    siteOverview: db.settings.siteOverview,
  });

  res.json({
    success: true,
    message: 'تم حفظ وتطبيق إعدادات السيستم وبيانات المؤسس بنجاح وحفظها سحابياً.',
    branding: {
      systemName: db.settings.systemName,
      systemSubtitle: db.settings.systemSubtitle,
      systemBadge: db.settings.systemBadge,
      logoType: db.settings.logoType,
      logoPreset: db.settings.logoPreset,
      logoUrl: db.settings.logoUrl,
      logoAccentColor: db.settings.logoAccentColor,

      founderName: db.settings.founderName,
      founderTitle: db.settings.founderTitle,
      founderBio: db.settings.founderBio,
      founderPhotoUrl: db.settings.founderPhotoUrl,
      founderQuote: db.settings.founderQuote,
      siteOverview: db.settings.siteOverview,
    },
  });
});

// ----------------------------------------------------
// Supervisors Endpoints (المشرفين)
// ----------------------------------------------------
app.get('/api/supervisors', (req, res) => {
  if (!db.supervisors) {
    db.supervisors = [...DEFAULT_SUPERVISORS];
  }
  const sorted = [...db.supervisors].sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json({ supervisors: sorted });
});

app.post('/api/admin/supervisors', async (req, res) => {
  const { name, title, bio, photoUrl, email, phone, department, order } = req.body;
  if (!name || !String(name).trim() || !title || !String(title).trim()) {
    return res.status(400).json({ error: 'اسم المشرف وصفته الرسمية مطلوبان' });
  }

  if (!db.supervisors) {
    db.supervisors = [...DEFAULT_SUPERVISORS];
  }

  const newSupervisor: StoredSupervisor = {
    id: `sup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: String(name).trim(),
    title: String(title).trim(),
    bio: String(bio || '').trim(),
    photoUrl: String(photoUrl || '').trim(),
    email: String(email || '').trim(),
    phone: String(phone || '').trim(),
    department: String(department || '').trim(),
    order: Number(order) || (db.supervisors.length + 1),
    createdAt: new Date().toISOString(),
  };

  db.supervisors.push(newSupervisor);
  saveDB();
  await saveSupervisorToFirestore(newSupervisor);

  res.status(201).json({
    success: true,
    message: `تمت إضافة المشرف "${newSupervisor.name}" بنجاح`,
    supervisor: newSupervisor,
    supervisors: db.supervisors.sort((a, b) => (a.order || 0) - (b.order || 0)),
  });
});

app.put('/api/admin/supervisors/:id', async (req, res) => {
  const { id } = req.params;
  const { name, title, bio, photoUrl, email, phone, department, order } = req.body;

  if (!db.supervisors) {
    db.supervisors = [...DEFAULT_SUPERVISORS];
  }

  const index = db.supervisors.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'المشرف غير موجود' });
  }

  const existing = db.supervisors[index];
  const updated: StoredSupervisor = {
    ...existing,
    name: name !== undefined ? String(name).trim() : existing.name,
    title: title !== undefined ? String(title).trim() : existing.title,
    bio: bio !== undefined ? String(bio).trim() : existing.bio,
    photoUrl: photoUrl !== undefined ? String(photoUrl).trim() : existing.photoUrl,
    email: email !== undefined ? String(email).trim() : existing.email,
    phone: phone !== undefined ? String(phone).trim() : existing.phone,
    department: department !== undefined ? String(department).trim() : existing.department,
    order: order !== undefined ? Number(order) : existing.order,
  };

  db.supervisors[index] = updated;
  saveDB();
  await saveSupervisorToFirestore(updated);

  res.json({
    success: true,
    message: `تم تحديث بيانات المشرف "${updated.name}" بنجاح`,
    supervisor: updated,
    supervisors: db.supervisors.sort((a, b) => (a.order || 0) - (b.order || 0)),
  });
});

app.delete('/api/admin/supervisors/:id', async (req, res) => {
  const { id } = req.params;
  if (!db.supervisors) {
    db.supervisors = [...DEFAULT_SUPERVISORS];
  }

  const index = db.supervisors.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'المشرف المطلوب حذفه غير موجود' });
  }

  const removed = db.supervisors[index];
  db.supervisors.splice(index, 1);
  saveDB();
  await deleteSupervisorFromFirestore(id);

  res.json({
    success: true,
    message: `تم حذف المشرف "${removed.name}" بنجاح`,
    deletedId: id,
    supervisors: db.supervisors.sort((a, b) => (a.order || 0) - (b.order || 0)),
  });
});

// ----------------------------------------------------
// Related Sites Endpoints (مواقع ذات صلة)
// ----------------------------------------------------
app.get('/api/related-sites', (req, res) => {
  if (!db.relatedSites) {
    db.relatedSites = [...DEFAULT_RELATED_SITES];
  }
  res.json({ relatedSites: db.relatedSites });
});

app.post('/api/admin/related-sites', async (req, res) => {
  const { title, description, url, category, iconType, isOfficial } = req.body;
  if (!title || !String(title).trim() || !url || !String(url).trim()) {
    return res.status(400).json({ error: 'اسم الموقع ورابطه مطلوبان' });
  }

  if (!db.relatedSites) {
    db.relatedSites = [...DEFAULT_RELATED_SITES];
  }

  const newSite: StoredRelatedSite = {
    id: `site-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title: String(title).trim(),
    description: String(description || '').trim(),
    url: String(url).trim(),
    category: String(category || 'خدمات حكومية').trim(),
    iconType: String(iconType || 'globe').trim(),
    isOfficial: isOfficial !== false,
    createdAt: new Date().toISOString(),
  };

  db.relatedSites.push(newSite);
  saveDB();
  await saveRelatedSiteToFirestore(newSite);

  res.status(201).json({
    success: true,
    message: `تمت إضافة الموقع "${newSite.title}" بنجاح`,
    site: newSite,
    relatedSites: db.relatedSites,
  });
});

app.put('/api/admin/related-sites/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, url, category, iconType, isOfficial } = req.body;

  if (!db.relatedSites) {
    db.relatedSites = [...DEFAULT_RELATED_SITES];
  }

  const index = db.relatedSites.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'الموقع غير موجود' });
  }

  const existing = db.relatedSites[index];
  const updated: StoredRelatedSite = {
    ...existing,
    title: title !== undefined ? String(title).trim() : existing.title,
    description: description !== undefined ? String(description).trim() : existing.description,
    url: url !== undefined ? String(url).trim() : existing.url,
    category: category !== undefined ? String(category).trim() : existing.category,
    iconType: iconType !== undefined ? String(iconType).trim() : existing.iconType,
    isOfficial: isOfficial !== undefined ? Boolean(isOfficial) : existing.isOfficial,
  };

  db.relatedSites[index] = updated;
  saveDB();
  await saveRelatedSiteToFirestore(updated);

  res.json({
    success: true,
    message: `تم تحديث بيانات الموقع "${updated.title}" بنجاح`,
    site: updated,
    relatedSites: db.relatedSites,
  });
});

app.delete('/api/admin/related-sites/:id', async (req, res) => {
  const { id } = req.params;
  if (!db.relatedSites) {
    db.relatedSites = [...DEFAULT_RELATED_SITES];
  }

  const index = db.relatedSites.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'الموقع المطلوب حذفه غير موجود' });
  }

  const removed = db.relatedSites[index];
  db.relatedSites.splice(index, 1);
  saveDB();
  await deleteRelatedSiteFromFirestore(id);

  res.json({
    success: true,
    message: `تم حذف الموقع "${removed.title}" بنجاح`,
    deletedId: id,
    relatedSites: db.relatedSites,
  });
});

// ----------------------------------------------------
// Partners Endpoints (شركاؤنا - المؤسسات الشريكة)
// ----------------------------------------------------
app.get('/api/partners', (req, res) => {
  if (!db.partners) {
    db.partners = [...DEFAULT_PARTNERS];
  }
  res.json({ partners: db.partners });
});

app.post('/api/admin/partners', async (req, res) => {
  const { name, description, category, partnershipType, logoUrl, websiteUrl, order, isActive } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'اسم المؤسسة أو الشريك مطلوب' });
  }

  if (!db.partners) {
    db.partners = [...DEFAULT_PARTNERS];
  }

  const newPartner: StoredPartner = {
    id: `partner-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: String(name).trim(),
    description: String(description || '').trim(),
    category: String(category || 'مؤسسات شريكة').trim(),
    partnershipType: String(partnershipType || 'شريك استراتيجي').trim(),
    logoUrl: String(logoUrl || '').trim(),
    websiteUrl: String(websiteUrl || '').trim(),
    order: typeof order === 'number' ? order : db.partners.length + 1,
    isActive: isActive !== false,
    createdAt: new Date().toISOString(),
  };

  db.partners.push(newPartner);
  saveDB();
  await savePartnerToFirestore(newPartner);

  res.status(201).json({
    success: true,
    message: `تمت إضافة المؤسسة الشريكة "${newPartner.name}" بنجاح`,
    partner: newPartner,
    partners: db.partners,
  });
});

app.put('/api/admin/partners/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, category, partnershipType, logoUrl, websiteUrl, order, isActive } = req.body;

  if (!db.partners) {
    db.partners = [...DEFAULT_PARTNERS];
  }

  const index = db.partners.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'المؤسسة الشريكة غير موجودة' });
  }

  const existing = db.partners[index];
  const updated: StoredPartner = {
    ...existing,
    name: name !== undefined ? String(name).trim() : existing.name,
    description: description !== undefined ? String(description).trim() : existing.description,
    category: category !== undefined ? String(category).trim() : existing.category,
    partnershipType: partnershipType !== undefined ? String(partnershipType).trim() : existing.partnershipType,
    logoUrl: logoUrl !== undefined ? String(logoUrl).trim() : existing.logoUrl,
    websiteUrl: websiteUrl !== undefined ? String(websiteUrl).trim() : existing.websiteUrl,
    order: order !== undefined ? Number(order) : existing.order,
    isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
  };

  db.partners[index] = updated;
  saveDB();
  await savePartnerToFirestore(updated);

  res.json({
    success: true,
    message: `تم تحديث بيانات المؤسسة الشريكة "${updated.name}" بنجاح`,
    partner: updated,
    partners: db.partners,
  });
});

app.delete('/api/admin/partners/:id', async (req, res) => {
  const { id } = req.params;
  if (!db.partners) {
    db.partners = [...DEFAULT_PARTNERS];
  }

  const index = db.partners.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'المؤسسة الشريكة غير موجودة' });
  }

  const removed = db.partners[index];
  db.partners.splice(index, 1);
  saveDB();
  await deletePartnerFromFirestore(id);

  res.json({
    success: true,
    message: `تم حذف المؤسسة الشريكة "${removed.name}" بنجاح`,
    deletedId: id,
    partners: db.partners,
  });
});

// Reset Branding to Default
app.post('/api/admin/settings/branding/reset', async (req, res) => {
  if (!db.settings) {
    db.settings = {
      autoApproveNewUsers: true,
      defaultTrialDays: 7,
      trialPolicyEnabled: true,
      ...DEFAULT_BRANDING,
    };
  }

  Object.assign(db.settings, DEFAULT_BRANDING);
  saveDB();

  await saveSettingsToFirestore({
    autoApproveNewUsers: db.settings.autoApproveNewUsers !== false,
    defaultTrialDays: db.settings.defaultTrialDays || 7,
    trialPolicyEnabled: true,
    ...DEFAULT_BRANDING,
  });

  res.json({
    success: true,
    message: 'تم استعادة الاسم والشعار الافتراضي للسيستم بنجاح.',
    branding: DEFAULT_BRANDING,
  });
});

// Update Platform About Content (Overview, Vision, Mission, Custom Sections)
app.post('/api/admin/settings/about', async (req, res) => {
  const {
    overviewTitle,
    overviewContent,
    visionTitle,
    visionContent,
    missionTitle,
    missionContent,
    customSections,
  } = req.body;

  if (!overviewContent || !String(overviewContent).trim()) {
    return res.status(400).json({ error: 'يرجى إدخال نبذة تعريفية صحيحة عن المنصة' });
  }

  const updatedAbout: StoredPlatformAbout = {
    overviewTitle: (overviewTitle && String(overviewTitle).trim()) || DEFAULT_PLATFORM_ABOUT.overviewTitle,
    overviewContent: String(overviewContent).trim(),
    visionTitle: (visionTitle && String(visionTitle).trim()) || DEFAULT_PLATFORM_ABOUT.visionTitle,
    visionContent: (visionContent && String(visionContent).trim()) || DEFAULT_PLATFORM_ABOUT.visionContent,
    missionTitle: (missionTitle && String(missionTitle).trim()) || DEFAULT_PLATFORM_ABOUT.missionTitle,
    missionContent: (missionContent && String(missionContent).trim()) || DEFAULT_PLATFORM_ABOUT.missionContent,
    customSections: Array.isArray(customSections) ? customSections : (db.platformAbout?.customSections || []),
    updatedAt: new Date().toISOString(),
  };

  db.platformAbout = updatedAbout;
  saveDB();

  await savePlatformAboutToFirestore(updatedAbout);

  res.json({
    success: true,
    message: 'تم حفظ وتحديث محتوى «عن المنصة والرؤية والرسالة» بنجاح في قاعدة البيانات السحابية.',
    platformAbout: updatedAbout,
  });
});

// Reset Platform About to Default
app.post('/api/admin/settings/about/reset', async (req, res) => {
  db.platformAbout = { ...DEFAULT_PLATFORM_ABOUT, updatedAt: new Date().toISOString() };
  saveDB();

  await savePlatformAboutToFirestore(db.platformAbout);

  res.json({
    success: true,
    message: 'تم استعادة المحتوى الافتراضي لـ «عن المنصة والرؤية والرسالة» بنجاح.',
    platformAbout: db.platformAbout,
  });
});

// Update Contact Us Info (WhatsApp numbers, Email, Phone, Address, Hours)
app.post('/api/admin/settings/contact', async (req, res) => {
  const {
    whatsappNumbers,
    email,
    secondaryEmail,
    phoneNumbers,
    workHours,
    address,
    notes,
  } = req.body;

  const current = db.contactInfo || DEFAULT_CONTACT_INFO;

  const updatedContact: StoredContactInfo = {
    whatsappNumbers: Array.isArray(whatsappNumbers)
      ? whatsappNumbers.map((item: any, index: number) => ({
          id: item.id || `wa-${Date.now()}-${index}`,
          name: String(item.name || '').trim(),
          number: String(item.number || '').trim(),
          description: item.description ? String(item.description).trim() : '',
        }))
      : current.whatsappNumbers,
    email: email !== undefined ? String(email).trim() : current.email,
    secondaryEmail: secondaryEmail !== undefined ? String(secondaryEmail).trim() : (current.secondaryEmail || ''),
    phoneNumbers: Array.isArray(phoneNumbers)
      ? phoneNumbers.map((p: any, index: number) => ({
          id: p.id || `ph-${Date.now()}-${index}`,
          name: String(p.name || '').trim(),
          number: String(p.number || '').trim(),
        }))
      : (current.phoneNumbers || []),
    workHours: workHours !== undefined ? String(workHours).trim() : current.workHours,
    address: address !== undefined ? String(address).trim() : current.address,
    notes: notes !== undefined ? String(notes).trim() : current.notes,
    updatedAt: new Date().toISOString(),
  };

  db.contactInfo = updatedContact;
  saveDB();

  await saveContactInfoToFirestore(updatedContact);

  res.json({
    success: true,
    message: 'تم حفظ وتحديث بيانات التواصل وأرقام الواتساب بنجاح في قاعدة البيانات السحابية.',
    contactInfo: updatedContact,
  });
});

// Reset Contact Info to Default
app.post('/api/admin/settings/contact/reset', async (req, res) => {
  db.contactInfo = { ...DEFAULT_CONTACT_INFO, updatedAt: new Date().toISOString() };
  saveDB();
  await saveContactInfoToFirestore(db.contactInfo);

  res.json({
    success: true,
    message: 'تمت استعادة بيانات التواصل الافتراضية بنجاح.',
    contactInfo: db.contactInfo,
  });
});

// Update default trial days setting
app.post('/api/admin/settings/trial', async (req, res) => {
  const { defaultTrialDays } = req.body;
  const days = parseInt(String(defaultTrialDays), 10);
  if (isNaN(days) || days < 1) {
    return res.status(400).json({ error: 'يرجى إدخال عدد أيام تجريبية صالح (يوم واحد على الأقل)' });
  }

  if (!db.settings) {
    db.settings = { autoApproveNewUsers: true, defaultTrialDays: 7, trialPolicyEnabled: true };
  }
  db.settings.defaultTrialDays = days;
  saveDB();

  await saveSettingsToFirestore({
    autoApproveNewUsers: db.settings.autoApproveNewUsers !== false,
    defaultTrialDays: days,
    trialPolicyEnabled: true,
  });

  res.json({
    success: true,
    defaultTrialDays: days,
    message: `تم تحديد الفترة التجريبية الافتراضية للحسابات الجديدة إلى ${days} أيام بنجاح وحفظها سحابياً.`,
  });
});

// Update auto-approve setting
app.post('/api/admin/settings/auto-approve', (req, res) => {
  const { enabled } = req.body;
  if (!db.settings) {
    db.settings = { autoApproveNewUsers: true, defaultTrialDays: 7, trialPolicyEnabled: true };
  }
  db.settings.autoApproveNewUsers = Boolean(enabled);
  saveDB();

  saveSettingsToFirestore({
    autoApproveNewUsers: db.settings.autoApproveNewUsers,
    defaultTrialDays: db.settings.defaultTrialDays || 7,
    trialPolicyEnabled: true,
  }).catch((e) => console.error('Error saving settings to Firestore:', e));

  res.json({
    success: true,
    autoApprove: db.settings.autoApproveNewUsers,
    message: db.settings.autoApproveNewUsers
      ? 'تم تفعيل نظام القبول التلقائي للحسابات الجديدة بنجاح'
      : 'تم إيقاف نظام القبول التلقائي (الموافقة اليدوية مطلوبة للحسابات الجديدة)',
  });
});

// Auto-Approve ALL Pending Users at once
app.post('/api/admin/users/auto-approve-all', async (req, res) => {
  const pendingUsers = db.users.filter((u) => u.status === 'pending');
  const now = new Date();
  const defaultDays = db.settings?.defaultTrialDays || 7;

  for (const user of pendingUsers) {
    user.status = 'approved';
    user.reviewedAt = now.toISOString();
    user.subscriptionStatus = 'trial';
    user.trialDays = defaultDays;
    user.trialStartedAt = now.toISOString();
    user.trialEndsAt = new Date(now.getTime() + defaultDays * 24 * 60 * 60 * 1000).toISOString();

    updateUserInFirestore(user.id, {
      status: 'approved',
      reviewedAt: user.reviewedAt,
      subscriptionStatus: 'trial',
      trialDays: defaultDays,
      trialStartedAt: user.trialStartedAt,
      trialEndsAt: user.trialEndsAt,
    }).catch((err) => {
      console.error('Firestore bulk update error:', err);
    });
  }
  saveDB();
  const safeUsers = db.users.map(toSafeUser);
  res.json({
    success: true,
    count: pendingUsers.length,
    message: `تم قبول واعتماد جميع الطلبات المعلقة (${pendingUsers.length}) بنجاح وتفعيل الفترة التجريبية (${defaultDays} أيام)!`,
    users: safeUsers,
  });
});

// Get all users with real-time trial and subscription calculations (Admin view with credentials)
app.get('/api/admin/users', (req, res) => {
  const adminUsers = db.users.map(toAdminUser);
  res.json({ users: adminUsers });
});

// Get a single user by username (for real-time sync of current user status)
app.get('/api/users/by-username/:username', (req, res) => {
  const username = req.params.username;
  const user = db.users.find(u => u.username === username);
  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }
  res.json({ user: toSafeUser(user) });
});

// Update user status (Accept or Reject)
app.post('/api/admin/users/:id/status', async (req, res) => {
  const id = String(req.params.id).trim();
  const { status } = req.body;

  if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
    return res.status(400).json({ error: 'الحالة غير صالحة' });
  }

  const user = db.users.find(
    (u) => u.id === id || u.username.toLowerCase() === id.toLowerCase()
  );
  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  const now = new Date();
  user.status = status;
  user.reviewedAt = now.toISOString();

  // If approved and has no trial yet, allocate default trial
  if (status === 'approved') {
    if (!user.isSubscribed) {
      user.subscriptionStatus = 'trial';
      const days = user.trialDays || db.settings?.defaultTrialDays || 7;
      user.trialDays = days;
      user.trialStartedAt = user.trialStartedAt || now.toISOString();
      if (!user.trialEndsAt || new Date(user.trialEndsAt).getTime() <= now.getTime()) {
        user.trialEndsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      }
    }
  }

  saveDB();
  updateUserInFirestore(user.id, {
    status: user.status,
    reviewedAt: user.reviewedAt,
    subscriptionStatus: user.subscriptionStatus,
    trialDays: user.trialDays,
    trialStartedAt: user.trialStartedAt,
    trialEndsAt: user.trialEndsAt,
  }).catch((err) => {
    console.error(`Firestore update error for ${user.id}:`, err);
  });

  const safeUsers = db.users.map(toSafeUser);
  res.json({
    message: `تم تحديث حالة المستخدم "${user.fullName || user.username}" إلى: ${
      status === 'approved'
        ? 'مقبول ومصرّح لاستخدام البوت'
        : status === 'rejected'
        ? 'مرفوض (ممنوع من الاستخدام)'
        : 'قيد المراجعة'
    }`,
    user: toSafeUser(user),
    users: safeUsers,
  });
});

// Set / Toggle User Subscription (Activate full subscription or deactivate)
app.post('/api/admin/users/:id/subscription', async (req, res) => {
  const id = String(req.params.id).trim();
  const { isSubscribed, plan } = req.body;

  const user = db.users.find(
    (u) => u.id === id || u.username.toLowerCase() === id.toLowerCase()
  );
  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  const subscribeActive = Boolean(isSubscribed);
  user.isSubscribed = subscribeActive;

  if (subscribeActive) {
    user.status = 'approved';
    user.subscriptionStatus = 'active';
    user.subscribedAt = new Date().toISOString();
    user.subscriptionPlan = plan || 'اشتراك كامل معتمد';
    user.frozenAt = undefined;
    user.freezeReason = undefined;
  } else {
    // If deactivated, check if trial is still valid or freeze
    user.subscribedAt = undefined;
    user.subscriptionPlan = undefined;
    const check = checkAndUpdateUserTrialStatus(user, false);
    user.subscriptionStatus = check.subscriptionStatus;
    user.status = check.isFrozen ? 'frozen' : 'approved';
  }

  saveDB();
  await updateUserInFirestore(user.id, {
    isSubscribed: user.isSubscribed,
    subscriptionStatus: user.subscriptionStatus,
    status: user.status,
    subscribedAt: user.subscribedAt || '',
    subscriptionPlan: user.subscriptionPlan || '',
    frozenAt: user.frozenAt || '',
    freezeReason: user.freezeReason || '',
  });

  const safeUsers = db.users.map(toSafeUser);
  res.json({
    success: true,
    message: subscribeActive
      ? `تم تفعيل الاشتراك الكامل للمستخدم "${user.fullName || user.username}" بنجاح وتصريحه بالكامل!`
      : `تم إلغاء الاشتراك الكامل للمستخدم "${user.fullName || user.username}".`,
    user: toSafeUser(user),
    users: safeUsers,
  });
});

// Customize or Extend Trial Period for a Specific User
app.post('/api/admin/users/:id/trial', async (req, res) => {
  const id = String(req.params.id).trim();
  const { trialDays, extendDays, customEndDate } = req.body;

  const user = db.users.find(
    (u) => u.id === id || u.username.toLowerCase() === id.toLowerCase()
  );
  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  const now = Date.now();
  let newEndDate: Date;

  if (customEndDate) {
    newEndDate = new Date(customEndDate);
  } else if (extendDays && !isNaN(Number(extendDays))) {
    const baseTime = user.trialEndsAt && new Date(user.trialEndsAt).getTime() > now
      ? new Date(user.trialEndsAt).getTime()
      : now;
    newEndDate = new Date(baseTime + Number(extendDays) * 24 * 60 * 60 * 1000);
  } else if (trialDays && !isNaN(Number(trialDays))) {
    newEndDate = new Date(now + Number(trialDays) * 24 * 60 * 60 * 1000);
  } else {
    return res.status(400).json({ error: 'يرجى تحديد عدد الأيام أو تاريخ انتهاء الفترة التجريبية' });
  }

  user.trialEndsAt = newEndDate.toISOString();
  user.trialDays = Math.max(1, Math.round((newEndDate.getTime() - now) / (24 * 60 * 60 * 1000)));
  user.subscriptionStatus = 'trial';
  user.status = 'approved';
  user.frozenAt = undefined;
  user.freezeReason = undefined;

  saveDB();
  await updateUserInFirestore(user.id, {
    trialEndsAt: user.trialEndsAt,
    trialDays: user.trialDays,
    subscriptionStatus: 'trial',
    status: 'approved',
    frozenAt: '',
    freezeReason: '',
  });

  const safeUsers = db.users.map(toSafeUser);
  res.json({
    success: true,
    message: `تم تحديث وتمديد الفترة التجريبية للمستخدم "${user.fullName || user.username}" حتى ${newEndDate.toLocaleDateString('ar-EG')} وتنشيط حسابه بنجاح.`,
    user: toSafeUser(user),
    users: safeUsers,
  });
});

// Freeze User Account Manually
app.post('/api/admin/users/:id/freeze', async (req, res) => {
  const id = String(req.params.id).trim();
  const { reason } = req.body;

  const user = db.users.find(
    (u) => u.id === id || u.username.toLowerCase() === id.toLowerCase()
  );
  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  user.status = 'frozen';
  user.subscriptionStatus = 'frozen';
  user.frozenAt = new Date().toISOString();
  user.freezeReason = reason || 'تم تجميد الحساب من قبل الإدارة المركزية لحين الاشتراك';

  saveDB();
  await updateUserInFirestore(user.id, {
    status: 'frozen',
    subscriptionStatus: 'frozen',
    frozenAt: user.frozenAt,
    freezeReason: user.freezeReason,
  });

  const safeUsers = db.users.map(toSafeUser);
  res.json({
    success: true,
    message: `تم تجميد حساب المستخدم "${user.fullName || user.username}" بنجاح.`,
    user: toSafeUser(user),
    users: safeUsers,
  });
});

// Unfreeze User Account
app.post('/api/admin/users/:id/unfreeze', async (req, res) => {
  const id = String(req.params.id).trim();
  const { grantTrialDays, activateSubscription } = req.body;

  const user = db.users.find(
    (u) => u.id === id || u.username.toLowerCase() === id.toLowerCase()
  );
  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  if (activateSubscription) {
    user.isSubscribed = true;
    user.subscriptionStatus = 'active';
    user.status = 'approved';
    user.subscribedAt = new Date().toISOString();
    user.subscriptionPlan = 'اشتراك معتمد';
  } else {
    const days = grantTrialDays && !isNaN(Number(grantTrialDays))
      ? Number(grantTrialDays)
      : (db.settings?.defaultTrialDays || 7);
    user.trialDays = days;
    user.trialStartedAt = new Date().toISOString();
    user.trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    user.subscriptionStatus = 'trial';
    user.status = 'approved';
  }

  user.frozenAt = undefined;
  user.freezeReason = undefined;

  saveDB();
  await updateUserInFirestore(user.id, {
    isSubscribed: Boolean(user.isSubscribed),
    subscriptionStatus: user.subscriptionStatus,
    status: user.status,
    trialDays: user.trialDays,
    trialStartedAt: user.trialStartedAt || '',
    trialEndsAt: user.trialEndsAt || '',
    frozenAt: '',
    freezeReason: '',
  });

  const safeUsers = db.users.map(toSafeUser);
  res.json({
    success: true,
    message: `تم فك تجميد حساب المستخدم "${user.fullName || user.username}" وتنشيطه بنجاح.`,
    user: toSafeUser(user),
    users: safeUsers,
  });
});

// Delete user (admin helper)
app.delete('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  const initialLen = db.users.length;
  db.users = db.users.filter((u) => u.id !== id);
  if (db.users.length < initialLen) {
    saveDB();
    await deleteUserFromFirestore(id);
    return res.json({ message: 'تم حذف المستخدم بنجاح' });
  }
  return res.status(404).json({ error: 'المستخدم غير موجود' });
});

// --- Laws Management Endpoints ---

// PDF Parsing & AI Legal Extraction endpoint powered directly by Gemini
app.post('/api/admin/parse-pdf', async (req, res) => {
  try {
    const { base64Data, fileName } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'لم يتم إرسال بيانات ملف الـ PDF' });
    }

    // Basic cleaning of file name for fallback title
    const cleanTitle = (fileName || 'تشريع فلسطيني')
      .replace(/\.pdf$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();

    // Determine estimated page count if possible via quick buffer check
    let estimatedPages = 1;
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const matches = buffer.toString('binary').match(/\/Type\s*\/Page[^s]/g);
      if (matches && matches.length > 0) {
        estimatedPages = matches.length;
      }
    } catch {
      // Non-blocking if buffer parsing fails
    }

    // 1. Dedicated AI extraction via Gemini
    const prompt = `قم بقراءة واستخراج كافة المواد والبنود والقرارات القانونية الواردة في هذا الملف بالكامل وباللغة العربية، مادة بمادة وبنداً ببند، وتجاهل أرقام الصفحات والترويسات المتكررة، ونظم النصوص المستخرجة بشكل رسمي وواضح.

المطلوب بدقة في النتيجة:
1. عنوان القانون أو التشريع (title): استخرج الاسم أو العنوان الرسمي الكامل للتشريع أو القرار (مثال: "قانون الجمارك الفلسطيني رقم ... لسنة ...").
2. التصنيف الأنسب (category): اختر أو حدد التصنيف التشريعي الأنسب من بين:
   - "جمارك" (لكل ما يتعلق بالتعرفة والرسوم الجمركية والاستيراد والتصدير والمنافذ)
   - "ضريبة دخل" (لكل ما يتعلق بضريبة الدخل والشرائح والإعفاءات والخصومات)
   - "ضريبة القيمة المضافة" (لكل ما يتعلق بضريبة القيمة المضافة والفواتير الضريبية)
   - "رسوم ومكوس" (لرسوم المعاملات والطوابع والرسوم الإدارية والمكوس)
   - أو أي تصنيف قانوني رئيسي واضح ينطبق على الوثيقة.
3. النص الكامل لجميع المواد القانونية (content):
   - اكتب نص كافة المواد والبنود والفقرات القانونية باللغة العربية بدقة وأمانة تشريعية.
   - مادة بمادة وبنداً ببند (مثال: "المادة (1): ... \\nالمادة (2): ...").
   - تجاهل تماماً أرقام الصفحات، الترويسات والهوامش المكررة، والأختام التي لا تشكل نصاً تشريعياً.
   - إذا كان المستند ممسوحاً ضوئياً (سكانر) أو صورة، استخدم قدراتك البصرية واللغوية الكاملة لقراءة الكلمات بدقة بالغة.
   - رتب ونظم النصوص بشكل رسمي ومنسق وواضح ومريح للقراءة والمطالعة القانونية.
4. ملخص موجز (summary): نبذة موجزة وشاملة توضح الغرض ونطاق تطبيق هذا القانون أو القرار.`;

    const ai = getGemini();
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
    ];

    let extractedData: {
      title: string;
      category: string;
      content: string;
      summary?: string;
    } | null = null;
    let usedModel: string = '';
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[AI-PDF] Extracting legal document via Gemini model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
          config: {
            systemInstruction:
              'أنت خبير قانوني وتشريعي متخصص في استخراج وهيكلة القوانين والأنظمة والقرارات الفلسطينية من وثائق PDF الرسمية والممسوحة ضوئياً.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: 'عنوان القانون أو التشريع الرسمي المستخرج بالكامل.',
                },
                category: {
                  type: Type.STRING,
                  description: 'التصنيف التشريعي الأنسب (جمارك، ضريبة دخل، ضريبة القيمة المضافة، رسوم ومكوس، إلخ).',
                },
                content: {
                  type: Type.STRING,
                  description:
                    'النص الكامل والشامل لكافة المواد والبنود والقرارات القانونية مادة بمادة وبنداً ببند.',
                },
                summary: {
                  type: Type.STRING,
                  description: 'ملخص موجز لنطاق وأهداف التشريع.',
                },
              },
              required: ['title', 'category', 'content'],
            },
          },
        });

        if (response?.text) {
          try {
            const parsed = JSON.parse(response.text);
            if (parsed && typeof parsed === 'object') {
              extractedData = {
                title: (parsed.title || cleanTitle).trim(),
                category: (parsed.category || 'جمارك').trim(),
                content: (parsed.content || '').trim(),
                summary: (parsed.summary || '').trim(),
              };
              usedModel = model;
              console.log(`[AI-PDF] Successfully extracted using ${model}: ${extractedData.title}`);
              break;
            }
          } catch (jsonErr) {
            console.warn(`[AI-PDF] JSON parse issue with model ${model}:`, jsonErr);
          }
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI-PDF] Gemini call failed with model ${model}:`, err?.message || err);
      }
    }

    // 2. Fallback to basic text stream extraction from buffer if Gemini models failed
    if (!extractedData || !extractedData.content) {
      console.warn('[AI-PDF] Gemini models unavailable or quota exceeded, attempting text stream fallback...');
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        const binaryStr = buffer.toString('latin1');
        const textBlocks: string[] = [];
        const textRegex = /BT\s*([\s\S]*?)\s*ET/g;
        let m;
        while ((m = textRegex.exec(binaryStr)) !== null) {
          const rawBlock = m[1];
          const strMatches = rawBlock.match(/\(([^)]+)\)/g);
          if (strMatches) {
            const cleanStr = strMatches.map((s) => s.slice(1, -1)).join(' ');
            if (cleanStr.trim()) textBlocks.push(cleanStr);
          }
        }
        if (textBlocks.length > 0) {
          const rawText = textBlocks.join('\n');
          extractedData = {
            title: cleanTitle,
            category: 'جمارك',
            content: rawText.slice(0, 50000).trim(),
            summary: 'تم استخراج النصوص التشريعية المتاحة من الملف.',
          };
        }
      } catch (fallbackErr) {
        console.error('[AI-PDF] Fallback extractor error:', fallbackErr);
      }
    }

    if (!extractedData || (!extractedData.content && !extractedData.title)) {
      return res.status(422).json({
        error:
          'تعذر استخراج المواد القانونية من الملف. يرجى التأكد من أن المستند واضح أو إدخال المواد يدوياً.',
      });
    }

    return res.json({
      title: extractedData.title || cleanTitle,
      category: extractedData.category || 'جمارك',
      content: extractedData.content || '',
      summary: extractedData.summary || '',
      numPages: estimatedPages,
      suggestedTitle: extractedData.title || cleanTitle,
      suggestedCategory: extractedData.category || 'جمارك',
      text: extractedData.content || '',
      method: usedModel ? 'gemini_ai' : 'fallback_parser',
      model: usedModel,
    });
  } catch (err: any) {
    console.error('Server PDF parsing error:', err);
    return res.status(500).json({
      error: 'تعذر استخراج النصوص من ملف الـ PDF: ' + (err?.message || 'خطأ غير معروف'),
    });
  }
});

// Get all laws
app.get('/api/laws', (req, res) => {
  res.json({ laws: db.laws });
});

// Create new law
app.post('/api/laws', async (req, res) => {
  const { title, category, content, sourceFileName, sourceFileSize, pageCount } = req.body;
  if (!title || !category || !content) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة (عنوان القانون، التصنيف، نص المواد)' });
  }

  const newLaw: StoredLaw = {
    id: 'law-' + Date.now(),
    title: String(title).trim(),
    category: category,
    content: String(content).trim(),
    sourceFileName: sourceFileName ? String(sourceFileName).trim() : undefined,
    sourceFileSize: sourceFileSize ? String(sourceFileSize).trim() : undefined,
    pageCount: pageCount ? Number(pageCount) : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.laws.unshift(newLaw);
  saveDB();
  await saveLawToFirestore(newLaw);

  res.status(201).json({ message: 'تمت إضافة القانون بنجاح', law: newLaw });
});

// Update existing law
app.put('/api/laws/:id', async (req, res) => {
  const { id } = req.params;
  const { title, category, content, sourceFileName, sourceFileSize, pageCount } = req.body;

  const law = db.laws.find((l) => l.id === id);
  if (!law) {
    return res.status(404).json({ error: 'القانون غير موجود' });
  }

  if (title) law.title = String(title).trim();
  if (category) law.category = category;
  if (content) law.content = String(content).trim();
  if (sourceFileName !== undefined) law.sourceFileName = sourceFileName;
  if (sourceFileSize !== undefined) law.sourceFileSize = sourceFileSize;
  if (pageCount !== undefined) law.pageCount = pageCount;
  law.updatedAt = new Date().toISOString();

  saveDB();
  await updateLawInFirestore(law.id, {
    title: law.title,
    category: law.category,
    content: law.content,
    sourceFileName: law.sourceFileName,
    sourceFileSize: law.sourceFileSize,
    pageCount: law.pageCount,
    updatedAt: law.updatedAt,
  });
  res.json({ message: 'تم تحديث القانون بنجاح', law });
});

// Delete law
app.delete('/api/laws/:id', async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id).trim();
    const initialLen = db.laws.length;
    db.laws = db.laws.filter((l) => l.id !== id);

    // Ensure deleted from Cloud Firestore
    await deleteLawFromFirestore(id);
    saveDB();

    return res.json({ message: 'تم حذف القانون بنجاح من قاعدة البيانات والسحابة' });
  } catch (err: any) {
    console.error('Error deleting law:', err);
    return res.status(500).json({ error: 'حدث خطأ أثناء حذف القانون: ' + (err?.message || '') });
  }
});

// Categories Endpoints (Dynamic Legal Categories)
app.get('/api/categories', (req, res) => {
  if (!db.categories || db.categories.length === 0) {
    db.categories = [...DEFAULT_CATEGORIES];
  }
  res.json({ categories: db.categories });
});

app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'اسم التصنيف مطلوب' });
  }

  const trimmedName = name.trim();
  if (!db.categories) {
    db.categories = [...DEFAULT_CATEGORIES];
  }

  // Check for duplicates (case and whitespace insensitive)
  const isDuplicate = db.categories.some(
    (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (isDuplicate) {
    return res.status(400).json({ error: 'هذا التصنيف موجود بالفعل مسبقاً' });
  }

  const newCategory: StoredCategory = {
    id: `cat-${Date.now()}`,
    name: trimmedName,
    isDefault: false,
    createdAt: new Date().toISOString(),
  };

  db.categories.push(newCategory);
  saveDB();
  await saveCategoryToFirestore(newCategory);

  res.status(201).json({
    message: `تمت إضافة التصنيف "${newCategory.name}" بنجاح`,
    category: newCategory,
  });
});

app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  if (!db.categories) {
    db.categories = [...DEFAULT_CATEGORIES];
  }

  const index = db.categories.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'التصنيف المطلوب حذفه غير موجود' });
  }

  const catToDelete = db.categories[index];
  db.categories.splice(index, 1);
  saveDB();
  await deleteCategoryFromFirestore(id);

  res.json({
    message: `تم حذف التصنيف "${catToDelete.name}" بنجاح`,
    deletedId: id,
  });
});

// System Status Endpoint
app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'online',
    database: 'Google Cloud Firestore (Enterprise NoSQL)',
    provider: 'Cloud Firestore',
    projectId: 'pos1-d562e',
    databaseId: 'ai-studio-6d29bd6f-50fc-4475-8e3b-86e0db64d605',
    usersCount: db.users.length,
    lawsCount: db.laws.length,
    categoriesCount: (db.categories || []).length,
    timestamp: new Date().toISOString(),
  });
});

// --- Chat Endpoint for Approved Users ---

app.post('/api/chat', async (req, res) => {
  const { message, username } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'نص السؤال مطلوب' });
  }

  // Verify that the user is approved and not frozen/expired
  if (username) {
    const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (user) {
      if (user.status === 'pending') {
        return res.status(403).json({
          error: 'حسابك ما زال قيد المراجعة الإدارية. يرجى الانتظار لحين اعتماد حسابك.',
          status: 'pending',
        });
      }
      if (user.status === 'rejected') {
        return res.status(403).json({
          error: 'تم رفض طلب الحساب. لا يمكنك استخدام الشات.',
          status: 'rejected',
        });
      }

      // Check trial status in real-time
      const trialCheck = checkAndUpdateUserTrialStatus(user, true);
      if (trialCheck.isFrozen) {
        return res.status(403).json({
          error: 'عذراً، تم تجميد حسابك لانتهاء الفترة التجريبية المحددة دون اشتراك. يرجى الاشتراك لتفعيل الحساب ومتابعة الاستخدام.',
          status: 'frozen',
          isFrozen: true,
          subscriptionStatus: 'frozen',
          freezeReason: user.freezeReason,
          trialEndsAt: user.trialEndsAt,
        });
      }
    }
  }

  // 1. Organize knowledge base with chunking and relevant section priority
  const laws = db.laws;
  const { prioritizedContext, fullCatalog } = buildStructuredLegalContext(message, laws);

  // 2. Exact fixed system instructions specified by user:
  const systemInstruction = `أنت "مساعد الجمارك والضرائب"، مساعد افتراضي متخصص حصريًا في القوانين والأنظمة الفلسطينية المتعلقة بالجمارك والضرائب.
التزم بما يلي بدقة:
أجب فقط بالاعتماد على نصوص القوانين والمواد المستخرجة المرفقة أدناه تحت "قاعدة المعرفة". لا تخترع أرقامًا أو نسبًا من عندك.
إن لم تجد إجابة في القوانين المتاحة، قل بوضوح إن المعلومة غير متوفرة حاليًا وأنصح بمراجعة الجهة الرسمية المختصة.
اذكر مصدر كل إجابة في نهايتها بدقة (اسم القانون أو القرار ورقم المادة أو البند كما وردا في قاعدة المعرفة).
عند حساب ضريبة أو رسم، اعرض خطوات الحساب رقمًا برقم بشكل منسق وواضح، ثم اذكر الناتج النهائي بالشيكل بخط بارز.
أضف دائمًا في نهاية أي إجابة حسابية أو قانونية أن هذه إجابة استرشادية وليست استشارة رسمية ملزمة.
أجب بالعربية ما لم يطلب المستخدم غير ذلك. استخدم عناوين قصيرة وقوائم نقطية، وتجنب الفقرات الطويلة المتصلة.
التزم الحياد التام وعدم إبداء آراء سياسية شخصية.

${prioritizedContext}

قاعدة المعرفة (القوانين والتشريعات المتاحة حاليًا):
${fullCatalog}`;

  try {
    const ai = getGemini();
    // Prioritize high-throughput models with generous limits
    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let response = null;
    let lastErr = null;

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: message,
          config: {
            systemInstruction,
            temperature: 0.2, // Low temperature for high factual accuracy against legal text
          },
        });
        if (response?.text) {
          break;
        }
      } catch (e: any) {
        lastErr = e;
        const isQuotaError =
          e?.status === 429 ||
          e?.message?.includes('429') ||
          e?.message?.includes('quota') ||
          e?.message?.includes('RESOURCE_EXHAUSTED');

        console.warn(`Model ${modelName} call failed (quota: ${isQuotaError}):`, e?.message || e);
        // If quota exceeded or error, smoothly cascade to next model
        continue;
      }
    }

    if (response?.text) {
      return res.json({ reply: response.text });
    }

    // Graceful Knowledge Base Fallback if Gemini quota is completely exhausted
    console.warn('All Gemini models exhausted, using legal database knowledge retrieval fallback.');
    const fallbackAnswer = generateKnowledgeFallback(message, db.laws);
    return res.json({ reply: fallbackAnswer, isFallback: true });
  } catch (error: any) {
    console.error('Error generating AI response:', error);
    // Even if client creation fails, provide direct legal database response
    const fallbackAnswer = generateKnowledgeFallback(message, db.laws);
    return res.json({ reply: fallbackAnswer, isFallback: true });
  }
});

// ----------------------------------------------------
// Conversations History API Endpoints (سجل المحادثات)
// ----------------------------------------------------

// Get conversations for a user
app.get('/api/conversations', async (req, res) => {
  const userId = req.query.userId as string | undefined;

  if (!db.conversations) {
    db.conversations = [];
  }

  // Filter from memory/JSON DB first
  let userConvs = db.conversations;
  if (userId) {
    userConvs = userConvs.filter((c) => c.userId === userId);
  }

  // Also check Firestore in parallel if needed
  try {
    const cloudConvs = await fetchConversationsFromFirestore(userId);
    if (cloudConvs && cloudConvs.length > 0) {
      // Merge with in-memory
      const map = new Map<string, StoredConversation>();
      for (const c of cloudConvs) {
        map.set(c.id, c);
      }
      for (const c of userConvs) {
        if (!map.has(c.id)) {
          map.set(c.id, c);
        }
      }
      userConvs = Array.from(map.values()).sort(
        (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
    }
  } catch (e) {
    console.warn('Could not fetch cloud conversations, using local DB:', e);
  }

  res.json({ conversations: userConvs });
});

// Create or update a conversation
app.post('/api/conversations', async (req, res) => {
  const { id, userId, title, messages, createdAt, updatedAt } = req.body;

  if (!id || !userId) {
    return res.status(400).json({ error: 'معرف المحادثة ومعرف المستخدم مطلوبان' });
  }

  if (!db.conversations) {
    db.conversations = [];
  }

  const existingIdx = db.conversations.findIndex((c) => c.id === id);
  const convObj: StoredConversation = {
    id,
    userId,
    title: title || 'محادثة جديدة',
    messages: Array.isArray(messages) ? messages : [],
    createdAt: createdAt || (existingIdx !== -1 ? db.conversations[existingIdx].createdAt : new Date().toISOString()),
    updatedAt: updatedAt || new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    db.conversations[existingIdx] = convObj;
  } else {
    db.conversations.unshift(convObj);
  }

  saveDB();
  // Async sync to Firestore
  saveConversationToFirestore(convObj).catch((e) => console.error('Failed to save conversation to Firestore:', e));

  res.status(200).json({ success: true, conversation: convObj });
});

// Rename conversation title
app.put('/api/conversations/:id/title', async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'العنوان الجديد مطلوب' });
  }

  if (!db.conversations) {
    db.conversations = [];
  }

  const existing = db.conversations.find((c) => c.id === id);
  if (existing) {
    existing.title = title.trim();
    existing.updatedAt = new Date().toISOString();
    saveDB();
    saveConversationToFirestore(existing).catch((e) => console.error('Failed to update title in Firestore:', e));
    return res.json({ success: true, conversation: existing });
  }

  // If not found in memory, try updating Firestore
  try {
    const cloudConvs = await fetchConversationsFromFirestore();
    const cloudConv = cloudConvs?.find((c) => c.id === id);
    if (cloudConv) {
      cloudConv.title = title.trim();
      cloudConv.updatedAt = new Date().toISOString();
      await saveConversationToFirestore(cloudConv);
      db.conversations.unshift(cloudConv);
      saveDB();
      return res.json({ success: true, conversation: cloudConv });
    }
  } catch (e) {
    console.error('Error updating cloud conversation:', e);
  }

  res.status(404).json({ error: 'المحادثة غير موجودة' });
});

// Delete single conversation
app.delete('/api/conversations/:id', async (req, res) => {
  const { id } = req.params;

  if (!db.conversations) {
    db.conversations = [];
  }

  const idx = db.conversations.findIndex((c) => c.id === id);
  if (idx !== -1) {
    db.conversations.splice(idx, 1);
    saveDB();
  }

  // Delete from Firestore
  deleteConversationFromFirestore(id).catch((e) => console.error('Failed to delete from Firestore:', e));

  res.json({ success: true, deletedId: id });
});

// Clear all conversations for a user
app.delete('/api/conversations', async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: 'معرف المستخدم مطلوب لحذف المحادثات' });
  }

  if (db.conversations) {
    db.conversations = db.conversations.filter((c) => c.userId !== userId);
    saveDB();
  }

  clearUserConversationsFromFirestore(userId).catch((e) => console.error('Failed to clear cloud conversations:', e));

  res.json({ success: true, message: 'تم مسح سجل المحادثات بنجاح' });
});

// Helper to chunk legal texts into articles, clauses, and sections
interface LegalChunk {
  lawTitle: string;
  category: string;
  sectionHeader: string;
  text: string;
  sourceFileName?: string;
  score?: number;
}

function chunkLawContent(law: StoredLaw): LegalChunk[] {
  const lines = law.content.split('\n');
  const chunks: LegalChunk[] = [];
  let currentHeader = 'مقدمة / أحكام عامة';
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Check if line represents an article or section boundary
    const isNewArticle =
      /^المادة\s*[\(0-9\:]/i.test(trimmed) ||
      /^البند\s*[\(0-9\:]/i.test(trimmed) ||
      /^الفصل\s*[\(0-9\:]/i.test(trimmed) ||
      /^---\s*\[صفحة\s*[0-9]+\]/i.test(trimmed);

    if (isNewArticle && currentLines.length > 0) {
      chunks.push({
        lawTitle: law.title,
        category: law.category,
        sectionHeader: currentHeader,
        text: currentLines.join('\n').trim(),
        sourceFileName: law.sourceFileName,
      });
      currentLines = [];
      currentHeader = trimmed.slice(0, 100);
    }
    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    chunks.push({
      lawTitle: law.title,
      category: law.category,
      sectionHeader: currentHeader,
      text: currentLines.join('\n').trim(),
      sourceFileName: law.sourceFileName,
    });
  }

  return chunks;
}

// Build structured legal context with high-priority chunks highlighted at the top
function buildStructuredLegalContext(
  query: string,
  laws: StoredLaw[]
): { prioritizedContext: string; fullCatalog: string } {
  if (laws.length === 0) {
    return {
      prioritizedContext: '',
      fullCatalog: 'لا توجد قوانين أو ملفات مدخلة حالياً في قاعدة المعرفة.',
    };
  }

  const normalizedQuery = query.toLowerCase();
  const keywords = normalizedQuery
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Score individual chunks across all laws
  const allChunks: LegalChunk[] = [];
  for (const law of laws) {
    const lawChunks = chunkLawContent(law);
    for (const chunk of lawChunks) {
      const fullText = (chunk.lawTitle + ' ' + chunk.category + ' ' + chunk.sectionHeader + ' ' + chunk.text).toLowerCase();
      let score = 0;
      for (const word of keywords) {
        if (fullText.includes(word)) {
          score += 1;
          // Extra weight if keyword is in the header or title
          if (chunk.sectionHeader.toLowerCase().includes(word) || chunk.lawTitle.toLowerCase().includes(word)) {
            score += 2;
          }
        }
      }
      chunk.score = score;
      allChunks.push(chunk);
    }
  }

  allChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  const topChunks = allChunks.filter((c) => (c.score || 0) > 0).slice(0, 5);

  let prioritizedContext = '';
  if (topChunks.length > 0) {
    prioritizedContext = `[أبرز المواد والبنود القانونية ذات الصلة المباشرة باستفسار المستخدم (اعتمد عليها واستشهد برقم مادتها وقانونها)]:\n` +
      topChunks
        .map(
          (c, idx) =>
            `--- بند ذو أولوية (${idx + 1}) ---\nالقانون: ${c.lawTitle} (${c.category})\n${c.sectionHeader}:\n${c.text}`
        )
        .join('\n\n');
  }

  const fullCatalog = laws
    .map((l, index) => {
      const pdfNote = l.sourceFileName ? ` [مستورد من PDF: ${l.sourceFileName}, ${l.pageCount || 1} صفحة]` : '';
      return `[قانون ${index + 1}${pdfNote}]\nعنوان التشريع: ${l.title}\nالتصنيف: ${l.category}\nنص المواد والبنود:\n${l.content}`;
    })
    .join('\n\n-------------------------\n\n');

  return { prioritizedContext, fullCatalog };
}

// Helper for local legal knowledge retrieval when API quota is constrained
function generateKnowledgeFallback(query: string, laws: StoredLaw[]): string {
  const normalizedQuery = query.toLowerCase();
  const keywords = normalizedQuery
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Score individual chunks across all laws to find specific articles
  const allChunks: LegalChunk[] = [];
  for (const law of laws) {
    const lawChunks = chunkLawContent(law);
    for (const chunk of lawChunks) {
      const fullText = (chunk.lawTitle + ' ' + chunk.category + ' ' + chunk.sectionHeader + ' ' + chunk.text).toLowerCase();
      let score = 0;
      for (const word of keywords) {
        if (fullText.includes(word)) score += 1;
      }
      chunk.score = score;
      if (score > 0) allChunks.push(chunk);
    }
  }

  allChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  const bestChunks = allChunks.slice(0, 3);

  if (bestChunks.length > 0) {
    let result = `### ⚖️ إجابة استرشادية مستندة إلى نصوص التشريعات المعتمدة:\n\n`;
    for (const chunk of bestChunks) {
      result += `#### 📜 ${chunk.lawTitle} (${chunk.category})\n`;
      result += `**${chunk.sectionHeader}**\n\n`;
      result += `${chunk.text}\n\n`;
      result += `**المصدر**: نصوص المواد المعتمدة في ${chunk.lawTitle} - التشريعات الرسمية في دولة فلسطين.\n\n`;
    }
    result += `\n---\n*ملاحظة: هذه إجابة استرشادية مستخرجة مباشرة من قاعدة المعرفة القانونية، وليست استشارة رسمية ملزمة.*`;
    return result;
  }

  return `عذراً، لم نتمكن من العثور على نص صريح ومباشر في نصوص القوانين المتاحة حالياً يغطي هذا الاستفسار بدقة.\n\nننصح بمراجعة الدائرة المختصة في وزارة المالية (الإدارة العامة للجمارك والمكوس أو الإدارة العامة لضريبة الدخل) للحصول على إفادة رسمية.`;
}

// Vite middleware & Static serving

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const isServerless = Boolean(
    process.env.VERCEL || 
    process.env.AWS_LAMBDA_FUNCTION_NAME || 
    process.env.NETLIFY ||
    process.env.FUNCTION_NAME
  );

  if (!isServerless && process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`⚡ Server listening on port ${PORT} (immediate readiness)`);
      // Non-blocking background sync with Firestore Cloud Database
      syncWithFirestore().catch((err) => {
        console.error('Background Firestore sync error:', err);
      });
    });
  }
}

startServer();



export default app;
