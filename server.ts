// Global polyfills for serverless environments (prevents pdfjs-dist / DOMMatrix crashes on Vercel/Node)
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor(_init?: any) {}
  };
}
if (typeof (globalThis as any).ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {
    width = 0;
    height = 0;
    data = new Uint8ClampedArray(0);
    constructor(w: number, h: number) { this.width = w; this.height = h; }
  };
}
if (typeof (globalThis as any).Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2D {
    constructor() {}
  };
}

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
  DEFAULT_PARTNERS,
  fetchSubscriptionPlansFromFirestore,
  saveSubscriptionPlanToFirestore,
  deleteSubscriptionPlanFromFirestore,
  DEFAULT_SUBSCRIPTION_PLANS,
  fetchPlatformAboutFromFirestore,
  savePlatformAboutToFirestore,
  DEFAULT_PLATFORM_ABOUT,
  fetchContactInfoFromFirestore,
  saveContactInfoToFirestore,
  DEFAULT_CONTACT_INFO,
  fetchConversationsFromFirestore,
  saveConversationToFirestore,
  deleteConversationFromFirestore,
  clearUserConversationsFromFirestore,
  fetchLawRequestsFromFirestore,
  saveLawRequestToFirestore,
  updateLawRequestInFirestore,
  deleteLawRequestFromFirestore,
  onDatabaseChange,
  isQuotaExceeded,
} from './server/firestore.ts';
import type {
  StoredPartner,
  StoredSubscriptionPlan,
  StoredAboutCard,
  StoredPlatformAbout,
  StoredContactInfo,
  StoredContactWhatsappItem,
  StoredContactPhoneItem,
  StoredConversation,
  StoredLawRequest,
} from './server/firestore.ts';

dotenv.config();

// Global safety handler for background stream lifecycle events and unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  const msg = String(reason?.message || reason || '');
  if (
    msg.includes('Disconnecting idle stream') ||
    msg.includes('Timed out waiting for new targets') ||
    msg.includes('CANCELLED')
  ) {
    return;
  }
  console.warn('Notice: Background promise rejected gracefully:', msg || reason);
});

process.on('uncaughtException', (err: any) => {
  const msg = String(err?.message || err || '');
  if (
    msg.includes('Disconnecting idle stream') ||
    msg.includes('Timed out waiting for new targets') ||
    msg.includes('CANCELLED')
  ) {
    return;
  }
  console.error('Unhandled process exception caught:', err);
});

const app = express();
const PORT = 3000;

// 1. CORS headers & OPTIONS preflight support (crucial for Vercel and cross-origin)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 2. Normalize API path if stripped or rewritten by Vercel serverless functions
app.use((req, res, next) => {
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-original-url']) as string;
  if (matchedPath && typeof matchedPath === 'string' && matchedPath.startsWith('/api/')) {
    req.url = matchedPath;
  } else {
    const url = req.url || '';
    if (!url.startsWith('/api') && (
      url.startsWith('/auth') ||
      url.startsWith('/laws') ||
      url.startsWith('/categories') ||
      url.startsWith('/settings') ||
      url.startsWith('/admin') ||
      url.startsWith('/chat') ||
      url.startsWith('/conversations') ||
      url.startsWith('/ask') ||
      url.startsWith('/export') ||
      url.startsWith('/supervisors') ||
      url.startsWith('/related-sites') ||
      url.startsWith('/partners') ||
      url.startsWith('/contact-info') ||
      url.startsWith('/platform-about') ||
      url.startsWith('/health') ||
      url.startsWith('/sync') ||
      url.startsWith('/users')
    )) {
      req.url = '/api' + url;
    }
  }
  next();
});

// 3. Body parsers IMMEDIATELY mounted so POST payload streams are never stalled by async middleware
app.use((req, res, next) => {
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      req.body = JSON.parse(req.body);
      (req as any)._body = true;
    } catch {}
  } else if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString('utf-8'));
      (req as any)._body = true;
    } catch {}
  } else if (req.body !== undefined && typeof req.body === 'object') {
    (req as any)._body = true;
  }
  next();
});
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// 4. Quick health check endpoint (essential for Vercel/Cloud diagnostics)
app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// --- Vercel & Firebase Sync Middleware ---
let syncPromise: Promise<void> | null = null;
let lastSyncTime = 0;

async function ensureDbSynced() {
  const now = Date.now();
  // Sync on cold start (lastSyncTime === 0) or refresh if older than 60 seconds
  const isStale = lastSyncTime === 0 || (now - lastSyncTime > 60000);
  
  if (!syncPromise || isStale) {
    syncPromise = syncWithFirestore().then(() => {
      lastSyncTime = Date.now();
    }).catch(err => {
      console.error("Sync failed:", err);
      lastSyncTime = Date.now(); // Back off 60s
    });
  }

  // Bounded wait of 2000ms max so that Vercel serverless functions never timeout
  await Promise.race([
    syncPromise,
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
}

// 5. Lightweight middleware (skip eager Firestore queries on every GET to conserve daily read quota)
app.use(async (req, res, next) => {
  next();
});

// Serve static assets from public folder (including pdf.worker.min.mjs)
const publicDir = path.join(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

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
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY
  );

  if (isServerless) {
    // In serverless environments, avoid holding long-lived HTTP streams
    return res.status(200).json({ status: 'ok', mode: 'serverless-sync' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  
  const cleanup = () => {
    syncClients.delete(res);
  };

  res.on('error', cleanup);
  res.on('close', cleanup);
  res.on('finish', cleanup);
  req.on('close', cleanup);

  syncClients.add(res);
});

// Broadcast changes from Firestore to connected SSE clients
onDatabaseChange((collectionName) => {
  syncClients.forEach(client => {
    try {
      if (!client.writableEnded && client.socket && !client.socket.destroyed) {
        client.write(`data: ${JSON.stringify({ type: 'update', collection: collectionName })}\n\n`);
      } else {
        syncClients.delete(client);
      }
    } catch (e) {
      syncClients.delete(client);
    }
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
  role: 'user' | 'admin' | 'supervisor';
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

  // Custom Auth Portal Texts
  authPortalHeaderTop?: string;
  authPortalHeaderBottom?: string;
  authPortalTitle?: string;
  authPortalSubtitle?: string;
  authPortalDescription?: string;
  authPortalFeature1?: string;
  authPortalFeature2?: string;
  authPortalFeature3?: string;
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
  lawRequests?: StoredLawRequest[];
  categories?: StoredCategory[];
  settings?: DBSettings;
  supervisors?: StoredSupervisor[];
  relatedSites?: StoredRelatedSite[];
  relatedSiteCategories?: string[];
  partners?: StoredPartner[];
  subscriptionPlans?: StoredSubscriptionPlan[];
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

const PERSISTENT_USERS_SEED: StoredUser[] = [
  {
    id: "user-1788696135951",
    subscribedAt: "",
    password: "1234567",
    trialStartedAt: "2026-09-06T12:02:15.951Z",
    createdAt: "2026-09-06T12:02:15.951Z",
    trialDays: 7,
    freezeReason: "انتهت الفترة التجريبية المحددة للحساب دون تفعيل الاشتراك",
    role: "user",
    status: "frozen",
    subscriptionStatus: "frozen",
    frozenAt: "2026-09-16T13:05:28.573Z",
    phone: "01011730179",
    fullName: "انس",
    username: "anas-1",
    subscriptionPlan: "",
    recoveryCode: "12345",
    trialEndsAt: "2026-09-13T12:02:15.951Z",
    reviewedAt: "2026-09-06T12:02:15.951Z",
    isSubscribed: false,
  },
  {
    id: "user-1788704521607",
    recoveryCode: "4321",
    fullName: "Test User",
    trialEndsAt: "2026-09-13T14:22:01.607Z",
    subscriptionPlan: "",
    isSubscribed: false,
    reviewedAt: "2026-09-06T14:22:01.607Z",
    password: "password",
    trialDays: 7,
    phone: "0599000000",
    subscribedAt: "",
    status: "frozen",
    username: "testuser",
    subscriptionStatus: "frozen",
    createdAt: "2026-09-06T14:22:01.607Z",
    freezeReason: "انتهت الفترة التجريبية المحددة للحساب دون تفعيل الاشتراك",
    frozenAt: "2026-09-16T13:05:28.573Z",
    role: "user",
  },
  {
    id: "user-1788729424344",
    username: "ahmed_1",
    frozenAt: "2026-09-16T13:05:28.573Z",
    reviewedAt: "2026-09-06T21:17:04.344Z",
    trialStartedAt: "2026-09-06T21:17:04.344Z",
    isSubscribed: false,
    password: "12345678",
    recoveryCode: "0000",
    subscriptionStatus: "frozen",
    status: "frozen",
    phone: "01011730179",
    fullName: "محمد",
    subscribedAt: "",
    role: "user",
    trialDays: 7,
    subscriptionPlan: "",
    trialEndsAt: "2026-09-13T21:17:04.344Z",
    createdAt: "2026-09-06T21:17:04.344Z",
    freezeReason: "انتهت الفترة التجريبية المحددة للحساب دون تفعيل الاشتراك",
  },
  {
    id: "user-1788877310077",
    freezeReason: "",
    fullName: "خالد",
    subscriptionPlan: "",
    status: "approved",
    trialStartedAt: "2026-09-08T14:21:50.077Z",
    subscribedAt: "",
    reviewedAt: "2026-09-08T14:21:50.077Z",
    trialEndsAt: "2026-10-08T14:21:50.077Z",
    isSubscribed: false,
    createdAt: "2026-09-08T14:21:50.077Z",
    username: "abed",
    recoveryCode: "1200",
    frozenAt: "",
    phone: "0599999999",
    password: "123456",
    role: "user",
    trialDays: 30,
    subscriptionStatus: "trial",
  },
  {
    id: "user-1788886428842",
    frozenAt: "",
    status: "approved",
    trialStartedAt: "2026-09-08T16:53:48.842Z",
    reviewedAt: "2026-09-08T16:53:48.842Z",
    createdAt: "2026-09-08T16:53:48.842Z",
    subscribedAt: "",
    username: "mqb99",
    freezeReason: "",
    trialEndsAt: "2026-10-08T16:53:48.842Z",
    password: "Qwezxc*-/-",
    trialDays: 30,
    fullName: "محمد محمود قباجة ذ",
    phone: "0598889688",
    subscriptionPlan: "",
    subscriptionStatus: "trial",
    recoveryCode: "9988",
    role: "user",
    isSubscribed: false,
  },
  {
    id: "user-1789300631180",
    freezeReason: "",
    trialEndsAt: "2026-10-30T11:57:11.180Z",
    phone: "0509998877",
    subscribedAt: "",
    status: "approved",
    fullName: "مستخدم التحقق",
    subscriptionStatus: "trial",
    trialStartedAt: "2026-09-13T11:57:11.180Z",
    password: "password123",
    recoveryCode: "1234",
    reviewedAt: "2026-09-13T11:57:11.180Z",
    isSubscribed: false,
    subscriptionPlan: "",
    createdAt: "2026-09-13T11:57:11.180Z",
    role: "user",
    trialDays: 47,
    username: "verifypathuser1",
    frozenAt: "",
  },
  {
    id: "user-1789332628388",
    recoveryCode: "112233",
    isSubscribed: false,
    trialDays: 7,
    role: "user",
    reviewedAt: "2026-09-13T20:50:28.388Z",
    createdAt: "2026-09-13T20:50:28.388Z",
    trialEndsAt: "2026-09-20T20:50:28.388Z",
    fullName: "عبد اللطيف",
    phone: "0599272016",
    status: "approved",
    password: "1234",
    trialStartedAt: "2026-09-13T20:50:28.388Z",
    subscriptionStatus: "trial",
    username: "abed1",
  },
  {
    id: "user-1789336669393",
    subscribedAt: "",
    fullName: "انس عبده",
    trialDays: 47,
    trialStartedAt: "2026-09-13T21:57:49.393Z",
    freezeReason: "",
    createdAt: "2026-09-13T21:57:49.393Z",
    username: "anas_123@sanadtax.com",
    subscriptionStatus: "trial",
    subscriptionPlan: "",
    role: "supervisor",
    frozenAt: "",
    recoveryCode: "11223344",
    phone: "01011790179",
    trialEndsAt: "2026-10-30T21:57:49.393Z",
    password: "1234567890",
    status: "approved",
    reviewedAt: "2026-09-13T21:58:29.607Z",
    isSubscribed: false,
  },
  {
    id: "user-1789390667275",
    isSubscribed: false,
    fullName: "احمد ماهر",
    recoveryCode: "1111",
    trialStartedAt: "2026-09-14T12:57:47.275Z",
    status: "approved",
    role: "user",
    trialEndsAt: "2026-09-21T12:57:47.275Z",
    phone: "01011668899",
    createdAt: "2026-09-14T12:57:47.275Z",
    username: "ahmd_ozre@sanadtax.com",
    subscriptionStatus: "trial",
    reviewedAt: "2026-09-14T12:57:47.275Z",
    password: "112233",
    trialDays: 7,
  },
  {
    id: "user-1789396673929",
    role: "user",
    createdAt: "2026-09-14T14:37:53.929Z",
    recoveryCode: "1111",
    reviewedAt: "2026-09-14T14:37:53.929Z",
    username: "sup_4fg3@sanadtax.com",
    isSubscribed: false,
    phone: "08001730179",
    subscriptionStatus: "trial",
    password: "12345678900",
    trialDays: 7,
    trialStartedAt: "2026-09-14T14:37:53.929Z",
    fullName: "انس",
    status: "approved",
    trialEndsAt: "2026-09-21T14:37:53.929Z",
  },
  {
    id: "user-1789397979649",
    password: "12345",
    trialStartedAt: "2026-09-14T14:59:39.649Z",
    reviewedAt: "2026-09-14T14:59:39.649Z",
    recoveryCode: "244",
    isSubscribed: false,
    username: "anas-42",
    createdAt: "2026-09-14T14:59:39.649Z",
    phone: "324222",
    role: "user",
    subscriptionStatus: "trial",
    status: "approved",
    fullName: "بثثب0987",
    trialDays: 7,
    trialEndsAt: "2026-09-21T14:59:39.649Z",
  },
  {
    id: "user-1789398047631",
    password: "12345678900",
    phone: "0101100010",
    recoveryCode: "1111",
    username: "sup_epvh@sanadtax.com",
    isSubscribed: false,
    frozenAt: "",
    trialStartedAt: "2026-09-14T15:00:47.631Z",
    trialDays: 7,
    role: "supervisor",
    status: "approved",
    freezeReason: "",
    trialEndsAt: "2026-09-21T15:00:47.631Z",
    reviewedAt: "2026-09-14T15:00:47.631Z",
    fullName: "بثثب0987",
    subscriptionStatus: "trial",
    createdAt: "2026-09-14T15:00:47.631Z",
  },
  {
    id: "user-1789421615022",
    status: "approved",
    phone: "01283367595",
    recoveryCode: "1111",
    role: "supervisor",
    trialStartedAt: "2026-09-14T21:33:35.022Z",
    isSubscribed: false,
    fullName: "عمار",
    subscriptionStatus: "trial",
    password: "12345678999",
    trialEndsAt: "2026-09-21T21:33:35.022Z",
    createdAt: "2026-09-14T21:33:35.022Z",
    reviewedAt: "2026-09-14T21:33:35.022Z",
    username: "sup_1kdu@sanadtax.com",
    trialDays: 7,
  },
  {
    id: "user-1789426489363",
    phone: "01210050132",
    username: "anas-6",
    trialStartedAt: "2026-09-14T22:54:49.363Z",
    subscriptionStatus: "trial",
    trialDays: 7,
    password: "123456789000",
    status: "approved",
    createdAt: "2026-09-14T22:54:49.363Z",
    role: "user",
    recoveryCode: "11111",
    reviewedAt: "2026-09-14T22:54:49.363Z",
    fullName: "المستعصم بالله",
    isSubscribed: false,
    trialEndsAt: "2026-09-21T22:54:49.363Z",
  },
  {
    id: "user-1789486119922",
    status: "approved",
    createdAt: "2026-09-15T15:28:39.922Z",
    recoveryCode: "1111111",
    role: "user",
    trialDays: 7,
    reviewedAt: "2026-09-15T15:28:39.922Z",
    isSubscribed: false,
    fullName: "عطيه",
    password: "11111111",
    phone: "01011730170",
    username: "ahmed_7",
    subscriptionStatus: "trial",
    trialStartedAt: "2026-09-15T15:28:39.922Z",
    trialEndsAt: "2026-09-22T15:28:39.922Z",
  }
];

const PERSISTENT_LAW_REQUESTS_SEED: StoredLawRequest[] = [
  {
    id: "req-1789443500022-vsz2",
    category: "رسوم ومكوس",
    rejectionReason: "",
    content: "[مستند PDF: مرسوم رقم 14 لسنة 2022 بشأن تنفيذ قرارات مجلس الامن]\n\nتم إرفاق المستند بنجاح بحجم (2.5 ميجابايت). يمكنك كتابة وتعديل نصوص المواد القانونية هنا ثم حفظها في قاعدة المعرفة.",
    reviewedAt: undefined,
    sourceFileSize: "2.5 ميجابايت",
    userId: "user-1789426489363",
    pageCount: 1,
    reviewedBy: undefined,
    userFullName: "المستعصم بالله",
    title: "مرسوم رقم 14 لسنة 2022 بشأن تنفيذ قرارات مجلس الامن",
    userName: "anas-6",
    status: "pending",
    createdAt: "2026-09-15T03:38:20.022Z",
    userPhone: "01210050132",
    sourceFileName: "مرسوم-رقم-14-لسنة-2022-بشأن-تنفيذ-قرارات-مجلس-الامن.pdf",
    description: ""
  },
  {
    id: "req-1789443006824-z040",
    title: "23 2019 طعن حقوق",
    category: "رسوم ومكوس",
    sourceFileSize: "15.1 كيلوبايت",
    status: "approved",
    userId: "user-1789426489363",
    userName: "anas-6",
    userFullName: "المستعصم بالله",
    userPhone: "01210050132",
    content: "طعن حقوق رقم 23 لسنة 2019 - محكمة النقض الفلسطينية بشأن الرسوم والتأمين والتعويضات.",
    createdAt: "2026-09-15T03:30:06.824Z",
    reviewedAt: "2026-09-15T03:32:00.000Z",
    reviewedBy: "المشرف"
  }
];

function initDB(): DBData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    // Read-only filesystem in Vercel/Lambda
  }

  const localRepoFile = path.join(process.cwd(), 'data', 'db.json');
  let targetFile = DB_FILE;
  if (!fs.existsSync(targetFile) && fs.existsSync(localRepoFile)) {
    targetFile = localRepoFile;
  }

  if (fs.existsSync(targetFile)) {
    try {
      const content = fs.readFileSync(targetFile, 'utf-8');
      const data = JSON.parse(content) as DBData;
      if (targetFile === localRepoFile && targetFile !== DB_FILE) {
        try {
          fs.writeFileSync(DB_FILE, content, 'utf-8');
        } catch {
          // Ephemeral /tmp write notice
        }
      }
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
      if (!data.relatedSiteCategories || data.relatedSiteCategories.length === 0) {
        data.relatedSiteCategories = Array.from(
          new Set((data.relatedSites || DEFAULT_RELATED_SITES).map((s) => s.category).filter(Boolean))
        );
      }
      if (!data.platformAbout) {
        data.platformAbout = { ...DEFAULT_PLATFORM_ABOUT };
      }
      if (!data.contactInfo) {
        data.contactInfo = { ...DEFAULT_CONTACT_INFO };
      }
      if (!data.users || data.users.length === 0) {
        data.users = [...PERSISTENT_USERS_SEED];
      }
      if (!data.laws || data.laws.length === 0) {
        data.laws = [...INITIAL_LAWS];
      }
      if (!data.lawRequests || data.lawRequests.length === 0) {
        data.lawRequests = [...PERSISTENT_LAW_REQUESTS_SEED];
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
    subscriptionPlans: [...DEFAULT_SUBSCRIPTION_PLANS],
    platformAbout: { ...DEFAULT_PLATFORM_ABOUT },
    contactInfo: { ...DEFAULT_CONTACT_INFO },
    users: [...PERSISTENT_USERS_SEED],
    laws: INITIAL_LAWS,
    lawRequests: [...PERSISTENT_LAW_REQUESTS_SEED],
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  } catch (err) {
    // Read-only filesystem or serverless ephemeral environment
  }
  return initialData;
}

let db = initDB();
if (!db.subscriptionPlans || db.subscriptionPlans.length === 0) {
  db.subscriptionPlans = [...DEFAULT_SUBSCRIPTION_PLANS];
}

function saveDB() {
  if (process.env.VERCEL) {
    // Skip saving to local disk on Vercel to prevent OOM crashes and EROFS errors
    return;
  }
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    // Gracefully ignore write errors on read-only environments
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
    if (isQuotaExceeded()) {
      console.log('ℹ️ Firestore quota limit exceeded. Using cached local database storage.');
      return;
    }
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

    // Attempt critical settings & users fetch first
    const [cloudSettings, cloudUsers] = await Promise.all([
      fetchSettingsFromFirestore().catch(() => null),
      fetchUsersFromFirestore().catch(() => null),
    ]);

    let changed = false;

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
      console.log(`✅ Loaded settings from Cloud Firestore.`);
    }

    if (cloudUsers && cloudUsers.length > 0) {
      db.users = cloudUsers;
      changed = true;
      console.log(`✅ Loaded ${cloudUsers.length} users from Cloud Firestore.`);
    }

    // Run trial expiration checks on all users
    for (const u of db.users) {
      checkAndUpdateUserTrialStatus(u, false);
    }

    // If quota hasn't been exceeded, sync remaining collections
    if (!isQuotaExceeded()) {
      const [cloudAbout, cloudContact, cloudCategories, cloudSupervisors, cloudRelatedSites, cloudPartners, cloudPlans, cloudLaws, cloudLawRequests] = await Promise.all([
        fetchPlatformAboutFromFirestore().catch(() => null),
        fetchContactInfoFromFirestore().catch(() => null),
        fetchCategoriesFromFirestore().catch(() => null),
        fetchSupervisorsFromFirestore().catch(() => null),
        fetchRelatedSitesFromFirestore().catch(() => null),
        fetchPartnersFromFirestore().catch(() => null),
        fetchSubscriptionPlansFromFirestore().catch(() => null),
        fetchLawsFromFirestore().catch(() => null),
        fetchLawRequestsFromFirestore().catch(() => null),
      ]);

      if (cloudContact) {
        db.contactInfo = cloudContact;
        changed = true;
      }
      if (cloudAbout) {
        db.platformAbout = cloudAbout;
        changed = true;
      }
      if (cloudLaws && cloudLaws.length > 0) {
        db.laws = cloudLaws;
        changed = true;
      }
      if (cloudCategories && cloudCategories.length > 0) {
        db.categories = cloudCategories;
        changed = true;
      }
      if (cloudSupervisors && cloudSupervisors.length > 0) {
        db.supervisors = cloudSupervisors;
        changed = true;
      }
      if (cloudRelatedSites && cloudRelatedSites.length > 0) {
        db.relatedSites = cloudRelatedSites;
        changed = true;
      }
      if (cloudPartners && cloudPartners.length > 0) {
        db.partners = cloudPartners;
        changed = true;
      }
      if (cloudPlans && cloudPlans.length > 0) {
        db.subscriptionPlans = cloudPlans;
        changed = true;
      }
      if (cloudLawRequests && cloudLawRequests.length > 0) {
        db.lawRequests = cloudLawRequests;
        changed = true;
      }
    }

    if (changed) {
      saveDB();
    }
    console.log('⚡ Cloud Firestore synchronization complete.');
  } catch (err) {
    console.warn('Notice: Cloud Firestore sync gracefully handled:', err);
  }
}

let firestoreInitialized = false;
let firestoreInitPromise: Promise<void> | null = null;

export async function ensureFirestoreReady() {
  if (firestoreInitialized) return;
  if (isQuotaExceeded()) {
    firestoreInitialized = true;
    return;
  }
  if (!firestoreInitPromise) {
    firestoreInitPromise = (async () => {
      try {
        await syncWithFirestore();
        firestoreInitialized = true;
      } catch (err) {
        console.warn('ensureFirestoreReady handled notice:', err);
        firestoreInitialized = true;
      }
    })();
  }
  return firestoreInitPromise;
}

// Ensure database is initialized in serverless environments (e.g. Vercel)
app.use(async (req, res, next) => {
  try {
    if (!firestoreInitialized && !isQuotaExceeded()) {
      await Promise.race([
        ensureFirestoreReady(),
        new Promise((r) => setTimeout(r, 400)),
      ]);
    }
  } catch (err) {
    // Graceful continuation
  }
  next();
});

// Fixed Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    // Find the key even if there are spaces or case differences
    const envKey = Object.keys(process.env).find(k => k.trim().toUpperCase() === 'GEMINI_API_KEY');
    const apiKey = envKey ? process.env[envKey]?.trim() : undefined;
    
    if (!apiKey) {
      const allKeys = Object.keys(process.env).filter(k => k.toUpperCase().includes('GEMINI')).map(k => `"${k}": "${process.env[k]}"`).join(', ');
      throw new Error(`مفتاح GEMINI_API_KEY غير متوفر أو فارغ. (المتغيرات الموجودة حالياً: ${allKeys || 'لا يوجد شيء'}). يرجى التأكد من أنك قمت بعمل Redeploy بعد إضافة المفتاح في Vercel.`);
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

// User Registration: New accounts automatically enter "pending" or "approved" state based on settings
app.post('/api/auth/register', async (req, res) => {
  try {
    if (!Array.isArray(db.users)) {
      db.users = [];
    }

    const { username, password, fullName, phone, recoveryCode, role } = req.body || {};
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

    // Check memory first
    let existingUser = db.users.find(
      (u) => u && u.username && u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );

    // If not found in memory, double check Firestore cloud
    if (!existingUser) {
      try {
        const cloudUsers = await fetchUsersFromFirestore();
        if (cloudUsers && Array.isArray(cloudUsers)) {
          db.users = cloudUsers;
          existingUser = db.users.find(
            (u) => u && u.username && u.username.toLowerCase() === trimmedUsername.toLowerCase()
          );
        }
      } catch (fErr) {
        console.warn('Could not query Firestore cloud during registration check:', fErr);
      }
    }

    if (existingUser) {
      return res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل، يرجى اختيار اسم آخر' });
    }

    // Check if phone number is already registered
    if (trimmedPhone) {
      const existingPhone = db.users.find((u) => u && u.phone && u.phone.trim() === trimmedPhone);
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
      role: role === 'supervisor' ? 'supervisor' : 'user',
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
    try {
      saveUserToFirestore(newUser).catch(e => console.error('Firestore save error:', e));
    } catch (saveErr) {
      console.error('Failed to sync new user to Firestore cloud:', saveErr);
    }

    return res.status(201).json({
      message: isAutoApprove
        ? `تم إنشاء الحساب واعتماده بنجاح! تم منحك فترة تجريبية مجانية لمدة ${defaultTrialDays} أيام لاستخدام مساعد الجمارك والضرائب.`
        : `تم تقديم طلب الحساب بنجاح، وهو قيد المراجعة الإدارية. تم تخصيص فترة تجريبية مدتها ${defaultTrialDays} أيام تبدأ فور الاعتماد.`,
      isAutoApproved: isAutoApprove,
      defaultTrialDays,
      trialEndsAt,
      user: toSafeUser(newUser),
    });
  } catch (err: any) {
    console.error('Registration internal error:', err);
    return res.status(500).json({ error: err?.message || 'حدث خطأ في الخادم أثناء تسجيل الحساب' });
  }
});

// User Login: Checks credentials, approval status, and trial expiration
app.post('/api/auth/login', async (req, res) => {
  try {
    if (!Array.isArray(db.users)) {
      db.users = [];
    }

    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم أو رقم الجوال وكلمة المرور' });
    }

    const trimmed = String(username).trim();
    let user = db.users.find(
      (u) =>
        u &&
        ((u.username && u.username.toLowerCase() === trimmed.toLowerCase()) ||
          (u.phone && u.phone.trim() === trimmed)) &&
        u.password === String(password)
    );

    // If not found in memory, query Firestore directly (essential for Vercel serverless cold starts)
    if (!user) {
      try {
        const cloudUsers = await fetchUsersFromFirestore();
        if (cloudUsers && Array.isArray(cloudUsers)) {
          db.users = cloudUsers;
          user = db.users.find(
            (u) =>
              u &&
              ((u.username && u.username.toLowerCase() === trimmed.toLowerCase()) ||
                (u.phone && u.phone.trim() === trimmed)) &&
              u.password === String(password)
          );
        }
      } catch (fErr) {
        console.warn('Firestore fallback check on login:', fErr);
      }
    }

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
  } catch (err: any) {
    console.error('Login internal error:', err);
    return res.status(500).json({ error: err?.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول' });
  }
});

// Password Reset using recovery code
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    if (!Array.isArray(db.users)) {
      db.users = [];
    }

    const { identifier, recoveryCode, newPassword } = req.body || {};
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

    let user = db.users.find(
      (u) =>
        u &&
        ((u.username && u.username.toLowerCase() === trimmedId) ||
          (u.phone && u.phone.trim().toLowerCase() === trimmedId))
    );

    // If not found in memory, query Firestore directly
    if (!user) {
      try {
        const cloudUsers = await fetchUsersFromFirestore();
        if (cloudUsers && Array.isArray(cloudUsers)) {
          db.users = cloudUsers;
          user = db.users.find(
            (u) =>
              u &&
              ((u.username && u.username.toLowerCase() === trimmedId) ||
                (u.phone && u.phone.trim().toLowerCase() === trimmedId))
          );
        }
      } catch (fErr) {
        console.warn('Firestore fallback check on reset-password:', fErr);
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'لم يتم العثور على حساب مسجل بهذا الاسم أو رقم الجوال' });
    }

    if (!user.recoveryCode || user.recoveryCode.trim().toLowerCase() !== trimmedCode) {
      return res.status(400).json({ error: 'رمز استعادة كلمة المرور غير صحيح لهذا الحساب' });
    }

    user.password = String(newPassword);
    saveDB();
    try {
      await updateUserInFirestore(user.id, { password: user.password });
    } catch (saveErr) {
      console.warn('Failed to update password in Firestore cloud:', saveErr);
    }

    return res.json({
      message: 'تم تعيين كلمة المرور الجديدة بنجاح! يمكنك الآن تسجيل الدخول بها.',
    });
  } catch (err: any) {
    console.error('Reset password internal error:', err);
    return res.status(500).json({ error: err?.message || 'حدث خطأ في الخادم أثناء إعادة تعيين كلمة المرور' });
  }
});

// Fixed Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
  }

  // Check main admin
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

  // Check supervisors
  if (db.users) {
    const supervisor = db.users.find(u => 
      u.role === 'supervisor' && 
      u.username.toLowerCase() === username.trim().toLowerCase() && 
      u.password === password
    );
    if (supervisor) {
      return res.json({
        message: 'تم تسجيل دخول المشرف بنجاح',
        admin: {
          username: supervisor.username,
          role: 'supervisor',
          fullName: supervisor.fullName
        },
      });
    }
  }

  return res.status(401).json({ error: 'بيانات اعتماد المسؤول أو المشرف غير صحيحة' });
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
app.get('/api/admin/init', async (req, res) => {
  try {
    if (!db.users || db.users.length === 0) {
      const cloudUsers = await fetchUsersFromFirestore();
      if (cloudUsers && Array.isArray(cloudUsers)) {
        db.users = cloudUsers;
      }
    }
  } catch (err) {
    console.error('Error ensuring users for /api/admin/init:', err);
  }

  const adminUsers = (db.users || []).map(toAdminUser);
  res.json({
    users: adminUsers,
    laws: db.laws,
    lawRequests: db.lawRequests || [],
    categories: db.categories || [],
    supervisors: (db.supervisors || []).sort((a, b) => (a.order || 0) - (b.order || 0)),
    relatedSites: db.relatedSites || [],
    partners: (db.partners || []).sort((a, b) => (a.order || 0) - (b.order || 0)),
    subscriptionPlans: (db.subscriptionPlans || []).sort((a, b) => (a.order || 0) - (b.order || 0)),
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
app.post('/api/admin/settings/branding', async (req, res, next) => {
  try {
    let body = req.body;
    if (typeof body === 'string' && body.trim()) {
      try {
        body = JSON.parse(body);
      } catch {}
    }
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
      authPortalHeaderTop,
      authPortalHeaderBottom,
      authPortalTitle,
      authPortalSubtitle,
      authPortalDescription,
      authPortalFeature1,
      authPortalFeature2,
      authPortalFeature3,
    } = body || {};

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
    // SAFETY CHECK: If string is way too large, reject it before saving
    if (db.settings.logoUrl && db.settings.logoUrl.length > 5000000) {
      return res.status(400).json({ error: 'حجم الصورة ضخم جداً، يرجى رفع صورة أصغر أو استخدام رابط.' });
    }
    if (founderPhotoUrl !== undefined) {
      if (String(founderPhotoUrl).length > 5000000) {
        return res.status(400).json({ error: 'حجم صورة المؤسس ضخم جداً.' });
      }
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

    if (authPortalHeaderTop !== undefined) db.settings.authPortalHeaderTop = String(authPortalHeaderTop).trim();
    if (authPortalHeaderBottom !== undefined) db.settings.authPortalHeaderBottom = String(authPortalHeaderBottom).trim();
    if (authPortalTitle !== undefined) db.settings.authPortalTitle = String(authPortalTitle).trim();
    if (authPortalSubtitle !== undefined) db.settings.authPortalSubtitle = String(authPortalSubtitle).trim();
    if (authPortalDescription !== undefined) db.settings.authPortalDescription = String(authPortalDescription).trim();
    if (authPortalFeature1 !== undefined) db.settings.authPortalFeature1 = String(authPortalFeature1).trim();
    if (authPortalFeature2 !== undefined) db.settings.authPortalFeature2 = String(authPortalFeature2).trim();
    if (authPortalFeature3 !== undefined) db.settings.authPortalFeature3 = String(authPortalFeature3).trim();

    saveDB();

    const firestorePayload = {
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
      
      authPortalHeaderTop: db.settings.authPortalHeaderTop,
      authPortalHeaderBottom: db.settings.authPortalHeaderBottom,
      authPortalTitle: db.settings.authPortalTitle,
      authPortalSubtitle: db.settings.authPortalSubtitle,
      authPortalDescription: db.settings.authPortalDescription,
      authPortalFeature1: db.settings.authPortalFeature1,
      authPortalFeature2: db.settings.authPortalFeature2,
      authPortalFeature3: db.settings.authPortalFeature3,
    };

    // Await cloud Firestore save with a safety timeout so Vercel doesn't freeze in-flight connections
    try {
      await Promise.race([
        saveSettingsToFirestore(firestorePayload),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore save timed out')), 4000)),
      ]);
    } catch (fsErr) {
      console.warn('Firestore settings cloud sync notice:', fsErr);
    }

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
  } catch (err: any) {
    console.error('Branding save error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'حدث خطأ أثناء حفظ الإعدادات: ' + (err?.message || 'خطأ غير معروف') });
    }
  }
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
  const { name, title, bio, photoUrl, phone, department, order } = req.body;
  if (!name || !String(name).trim() || !title || !String(title).trim()) {
    return res.status(400).json({ error: 'اسم المشرف وصفته الرسمية مطلوبان' });
  }

  if (!db.supervisors) {
    db.supervisors = [...DEFAULT_SUPERVISORS];
  }
  
  if (!db.users) {
    db.users = [];
  }

  // Auto generate system email containing "sanadtax" and a default password
  const uniqueSuffix = Math.random().toString(36).substr(2, 4);
  const generatedEmail = `sup_${uniqueSuffix}@sanadtax.com`;
  const generatedPassword = 'sanadtax' + uniqueSuffix;

  const newSupervisor: StoredSupervisor = {
    id: `sup-${Date.now()}-${uniqueSuffix}`,
    name: String(name).trim(),
    title: String(title).trim(),
    bio: String(bio || '').trim(),
    photoUrl: String(photoUrl || '').trim(),
    email: generatedEmail, // assigned automatically
    phone: String(phone || '').trim(),
    department: String(department || '').trim(),
    order: Number(order) || (db.supervisors.length + 1),
    createdAt: new Date().toISOString(),
  };
  
  // Create an auth user for this supervisor
  const newSupervisorUser = {
    id: `usr-${Date.now()}-${uniqueSuffix}`,
    username: generatedEmail,
    password: generatedPassword,
    fullName: String(name).trim(),
    role: 'supervisor' as any, // Cast to any to bypass type check for new role
    status: 'approved' as any,
    createdAt: new Date().toISOString(),
    isSubscribed: true
  };

  db.supervisors.push(newSupervisor);
  db.users.push(newSupervisorUser);
  saveDB();
  
  saveSupervisorToFirestore(newSupervisor).catch(e => console.error('Firestore save error:', e));
  saveUserToFirestore(newSupervisorUser).catch(e => console.error('Firestore save error:', e));

  res.status(201).json({
    success: true,
    message: `تمت إضافة المشرف "${newSupervisor.name}" بنجاح. كلمة المرور الافتراضية: ${generatedPassword}`,
    supervisor: newSupervisor,
    generatedPassword: generatedPassword,
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
  saveSupervisorToFirestore(updated).catch(e => console.error('Firestore save error:', e));

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

// Get all related site categories with counts
app.get('/api/related-sites/categories', (req, res) => {
  if (!db.relatedSites) {
    db.relatedSites = [...DEFAULT_RELATED_SITES];
  }
  if (!db.relatedSiteCategories) {
    db.relatedSiteCategories = Array.from(
      new Set(db.relatedSites.map((s) => s.category).filter(Boolean))
    );
  }

  const counts: Record<string, number> = {};
  db.relatedSites.forEach((site) => {
    const cat = (site.category && site.category.trim()) || 'عام';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const allNames = new Set<string>([...db.relatedSiteCategories, ...Object.keys(counts)]);
  const categories = Array.from(allNames)
    .filter(Boolean)
    .map((name) => ({
      name,
      count: counts[name] || 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'));

  res.json({ categories });
});

// Add new related site category
app.post('/api/admin/related-sites/categories', async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'يرجى إدخال اسم التصنيف' });
  }
  const cleanName = String(name).trim();

  if (!db.relatedSiteCategories) {
    db.relatedSiteCategories = Array.from(
      new Set((db.relatedSites || DEFAULT_RELATED_SITES).map((s) => s.category).filter(Boolean))
    );
  }

  if (db.relatedSiteCategories.includes(cleanName)) {
    return res.status(400).json({ error: 'هذا التصنيف موجود مسبقاً' });
  }

  db.relatedSiteCategories.push(cleanName);
  saveDB();

  res.status(201).json({
    success: true,
    message: `تمت إضافة تصنيف "${cleanName}" بنجاح`,
    category: cleanName,
    categories: db.relatedSiteCategories,
  });
});

// Rename related site category (updates all sites in this category)
app.put('/api/admin/related-sites/categories/rename', async (req, res) => {
  const { oldName, newName } = req.body;
  if (!oldName || !newName || !String(newName).trim()) {
    return res.status(400).json({ error: 'الاسم الحالي والاسم الجديد كلاهما مطلوبان' });
  }

  const cleanOld = String(oldName).trim();
  const cleanNew = String(newName).trim();

  if (!db.relatedSites) {
    db.relatedSites = [...DEFAULT_RELATED_SITES];
  }
  if (!db.relatedSiteCategories) {
    db.relatedSiteCategories = Array.from(
      new Set(db.relatedSites.map((s) => s.category).filter(Boolean))
    );
  }

  let updatedCount = 0;
  for (let i = 0; i < db.relatedSites.length; i++) {
    if (db.relatedSites[i].category === cleanOld) {
      db.relatedSites[i].category = cleanNew;
      updatedCount++;
      saveRelatedSiteToFirestore(db.relatedSites[i]).catch(e => console.error('Firestore save error:', e));
    }
  }

  db.relatedSiteCategories = db.relatedSiteCategories.map((c) => (c === cleanOld ? cleanNew : c));
  if (!db.relatedSiteCategories.includes(cleanNew)) {
    db.relatedSiteCategories.push(cleanNew);
  }

  saveDB();

  res.json({
    success: true,
    message: `تم تغيير مسمى التصنيف إلى "${cleanNew}" وتحديث ${updatedCount} موقع مرتبط به بنجاح`,
    updatedCount,
    relatedSites: db.relatedSites,
  });
});

// Delete related site category
app.delete('/api/admin/related-sites/categories/:name', async (req, res) => {
  const { name } = req.params;
  const decodedName = decodeURIComponent(name).trim();

  if (!db.relatedSiteCategories) {
    db.relatedSiteCategories = Array.from(
      new Set((db.relatedSites || DEFAULT_RELATED_SITES).map((s) => s.category).filter(Boolean))
    );
  }

  db.relatedSiteCategories = db.relatedSiteCategories.filter((c) => c !== decodedName);
  saveDB();

  res.json({
    success: true,
    message: `تم حذف التصنيف "${decodedName}" بنجاح`,
    categories: db.relatedSiteCategories,
  });
});

app.post('/api/admin/related-sites', async (req, res, next) => {
  try {
  const { title, description, url, category, iconType, isOfficial } = req.body;
  if (!title || !String(title).trim() || !url || !String(url).trim()) {
    return res.status(400).json({ error: 'اسم الموقع ورابطه مطلوبان' });
  }

  if (!db.relatedSites) {
    db.relatedSites = [...DEFAULT_RELATED_SITES];
  }
  if (!db.relatedSiteCategories) {
    db.relatedSiteCategories = Array.from(
      new Set(db.relatedSites.map((s) => s.category).filter(Boolean))
    );
  }

  const assignedCategory = String(category || 'خدمات حكومية').trim();
  if (assignedCategory && !db.relatedSiteCategories.includes(assignedCategory)) {
    db.relatedSiteCategories.push(assignedCategory);
  }

  const newSite: StoredRelatedSite = {
    id: `site-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title: String(title).trim(),
    description: String(description || '').trim(),
    url: String(url).trim(),
    category: assignedCategory,
    iconType: String(iconType || 'globe').trim(),
    isOfficial: isOfficial !== false,
    createdAt: new Date().toISOString(),
  };

  db.relatedSites.push(newSite);
  saveDB();
  saveRelatedSiteToFirestore(newSite).catch(e => console.error('Firestore save error:', e));

  res.status(201).json({
    success: true,
    message: `تمت إضافة الموقع "${newSite.title}" بنجاح`,
    site: newSite,
    relatedSites: db.relatedSites,
  });
  } catch (err: any) { next(err); }
});
app.put('/api/admin/related-sites/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, url, category, iconType, isOfficial } = req.body;

  if (!db.relatedSites) {
    db.relatedSites = [...DEFAULT_RELATED_SITES];
  }
  if (!db.relatedSiteCategories) {
    db.relatedSiteCategories = Array.from(
      new Set(db.relatedSites.map((s) => s.category).filter(Boolean))
    );
  }

  const index = db.relatedSites.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'الموقع غير موجود' });
  }

  const assignedCategory = category !== undefined ? String(category).trim() : db.relatedSites[index].category;
  if (assignedCategory && !db.relatedSiteCategories.includes(assignedCategory)) {
    db.relatedSiteCategories.push(assignedCategory);
  }

  const existing = db.relatedSites[index];
  const updated: StoredRelatedSite = {
    ...existing,
    title: title !== undefined ? String(title).trim() : existing.title,
    description: description !== undefined ? String(description).trim() : existing.description,
    url: url !== undefined ? String(url).trim() : existing.url,
    category: assignedCategory,
    iconType: iconType !== undefined ? String(iconType).trim() : existing.iconType,
    isOfficial: isOfficial !== undefined ? Boolean(isOfficial) : existing.isOfficial,
  };

  db.relatedSites[index] = updated;
  saveDB();
  saveRelatedSiteToFirestore(updated).catch(e => console.error('Firestore save error:', e));

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

app.post('/api/admin/partners', async (req, res, next) => {
  try {
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
  savePartnerToFirestore(newPartner).catch(e => console.error('Firestore save error:', e));

  res.status(201).json({
    success: true,
    message: `تمت إضافة المؤسسة الشريكة "${newPartner.name}" بنجاح`,
    partner: newPartner,
    partners: db.partners,
  });
  } catch (err: any) { next(err); }
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
  savePartnerToFirestore(updated).catch(e => console.error('Firestore save error:', e));

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

// ----------------------------------------------------
// Subscription Plans Management Endpoints (إدارة باقات وخطط الاشتراك)
// ----------------------------------------------------
app.get('/api/subscription-plans', (req, res) => {
  if (!db.subscriptionPlans || db.subscriptionPlans.length === 0) {
    db.subscriptionPlans = [...DEFAULT_SUBSCRIPTION_PLANS];
  }
  const all = req.query.all === 'true';
  const plans = (db.subscriptionPlans || [])
    .filter((p) => all || p.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json({ plans });
});

app.post('/api/admin/subscription-plans', async (req, res, next) => {
  try {
    const {
      name,
      badge,
      price,
      currency,
      billingPeriod,
      description,
      features,
      notIncludedFeatures,
      isPopular,
      buttonText,
      buttonActionType,
      buttonLink,
      whatsappCustomMessage,
      order,
      isActive,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'اسم خطة الاشتراك مطلوب' });
    }

    if (!db.subscriptionPlans) {
      db.subscriptionPlans = [...DEFAULT_SUBSCRIPTION_PLANS];
    }

    const newPlan: StoredSubscriptionPlan = {
      id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: String(name).trim(),
      badge: badge ? String(badge).trim() : '',
      price: price !== undefined && price !== '' ? (isNaN(Number(price)) ? String(price).trim() : Number(price)) : 0,
      currency: currency ? String(currency).trim() : '₪',
      billingPeriod: billingPeriod ? String(billingPeriod).trim() : 'شهرياً',
      description: description ? String(description).trim() : '',
      features: Array.isArray(features) ? features.filter((f: any) => Boolean(String(f).trim())).map((f: any) => String(f).trim()) : [],
      notIncludedFeatures: Array.isArray(notIncludedFeatures) ? notIncludedFeatures.filter((f: any) => Boolean(String(f).trim())).map((f: any) => String(f).trim()) : [],
      isPopular: Boolean(isPopular),
      buttonText: buttonText ? String(buttonText).trim() : 'اشترك الآن',
      buttonActionType: buttonActionType || 'register',
      buttonLink: buttonLink ? String(buttonLink).trim() : '',
      whatsappCustomMessage: whatsappCustomMessage ? String(whatsappCustomMessage).trim() : '',
      order: typeof order === 'number' ? order : db.subscriptionPlans.length + 1,
      isActive: isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.subscriptionPlans.push(newPlan);
    db.subscriptionPlans.sort((a, b) => (a.order || 0) - (b.order || 0));
    saveDB();
    saveSubscriptionPlanToFirestore(newPlan).catch((e) => console.error('Firestore save plan error:', e));

    res.status(201).json({
      success: true,
      message: `تمت إضافة خطة الاشتراك "${newPlan.name}" بنجاح`,
      plan: newPlan,
      plans: db.subscriptionPlans,
    });
  } catch (err: any) {
    next(err);
  }
});

app.put('/api/admin/subscription-plans/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      badge,
      price,
      currency,
      billingPeriod,
      description,
      features,
      notIncludedFeatures,
      isPopular,
      buttonText,
      buttonActionType,
      buttonLink,
      whatsappCustomMessage,
      order,
      isActive,
    } = req.body;

    if (!db.subscriptionPlans) {
      db.subscriptionPlans = [...DEFAULT_SUBSCRIPTION_PLANS];
    }

    const index = db.subscriptionPlans.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'خطة الاشتراك غير موجودة' });
    }

    const existing = db.subscriptionPlans[index];
    const updated: StoredSubscriptionPlan = {
      ...existing,
      name: name !== undefined ? String(name).trim() : existing.name,
      badge: badge !== undefined ? String(badge).trim() : existing.badge,
      price: price !== undefined && price !== '' ? (isNaN(Number(price)) ? String(price).trim() : Number(price)) : existing.price,
      currency: currency !== undefined ? String(currency).trim() : existing.currency,
      billingPeriod: billingPeriod !== undefined ? String(billingPeriod).trim() : existing.billingPeriod,
      description: description !== undefined ? String(description).trim() : existing.description,
      features: Array.isArray(features) ? features.filter((f: any) => Boolean(String(f).trim())).map((f: any) => String(f).trim()) : existing.features,
      notIncludedFeatures: Array.isArray(notIncludedFeatures) ? notIncludedFeatures.filter((f: any) => Boolean(String(f).trim())).map((f: any) => String(f).trim()) : existing.notIncludedFeatures,
      isPopular: isPopular !== undefined ? Boolean(isPopular) : existing.isPopular,
      buttonText: buttonText !== undefined ? String(buttonText).trim() : existing.buttonText,
      buttonActionType: buttonActionType !== undefined ? buttonActionType : existing.buttonActionType,
      buttonLink: buttonLink !== undefined ? String(buttonLink).trim() : existing.buttonLink,
      whatsappCustomMessage: whatsappCustomMessage !== undefined ? String(whatsappCustomMessage).trim() : existing.whatsappCustomMessage,
      order: order !== undefined ? Number(order) : existing.order,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      updatedAt: new Date().toISOString(),
    };

    db.subscriptionPlans[index] = updated;
    db.subscriptionPlans.sort((a, b) => (a.order || 0) - (b.order || 0));
    saveDB();
    saveSubscriptionPlanToFirestore(updated).catch((e) => console.error('Firestore update plan error:', e));

    res.json({
      success: true,
      message: `تم تحديث خطة الاشتراك "${updated.name}" بنجاح`,
      plan: updated,
      plans: db.subscriptionPlans,
    });
  } catch (err: any) {
    next(err);
  }
});

app.delete('/api/admin/subscription-plans/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!db.subscriptionPlans) {
      db.subscriptionPlans = [...DEFAULT_SUBSCRIPTION_PLANS];
    }

    const index = db.subscriptionPlans.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'خطة الاشتراك غير موجودة' });
    }

    const removed = db.subscriptionPlans[index];
    db.subscriptionPlans.splice(index, 1);
    saveDB();
    await deleteSubscriptionPlanFromFirestore(id);

    res.json({
      success: true,
      message: `تم حذف خطة الاشتراك "${removed.name}" بنجاح`,
      deletedId: id,
      plans: db.subscriptionPlans,
    });
  } catch (err: any) {
    next(err);
  }
});

// Reorder subscription plans
app.post('/api/admin/subscription-plans/reorder', async (req, res, next) => {
  try {
    const { orderMap } = req.body;
    if (!db.subscriptionPlans) {
      db.subscriptionPlans = [...DEFAULT_SUBSCRIPTION_PLANS];
    }

    if (Array.isArray(orderMap)) {
      orderMap.forEach((id: string, index: number) => {
        const plan = db.subscriptionPlans!.find((p) => p.id === id);
        if (plan) plan.order = index + 1;
      });
    } else if (orderMap && typeof orderMap === 'object') {
      Object.keys(orderMap).forEach((id) => {
        const plan = db.subscriptionPlans!.find((p) => p.id === id);
        if (plan) plan.order = Number(orderMap[id]);
      });
    }

    db.subscriptionPlans.sort((a, b) => (a.order || 0) - (b.order || 0));
    saveDB();
    Promise.all(db.subscriptionPlans.map((p) => saveSubscriptionPlanToFirestore(p))).catch((e) =>
      console.error('Firestore reorder plans error:', e)
    );

    res.json({
      success: true,
      message: 'تم حفظ ترتيب خطط الاشتراك بنجاح',
      plans: db.subscriptionPlans,
    });
  } catch (err: any) {
    next(err);
  }
});

// Reset subscription plans to defaults
app.post('/api/admin/subscription-plans/reset', async (req, res, next) => {
  try {
    db.subscriptionPlans = [...DEFAULT_SUBSCRIPTION_PLANS];
    saveDB();
    Promise.all(db.subscriptionPlans.map((p) => saveSubscriptionPlanToFirestore(p))).catch((e) =>
      console.error('Firestore reset plans error:', e)
    );

    res.json({
      success: true,
      message: 'تمت استعادة خطط الاشتراك الافتراضية بنجاح',
      plans: db.subscriptionPlans,
    });
  } catch (err: any) {
    next(err);
  }
});

// Reset Branding to Default
app.post('/api/admin/settings/branding/reset', async (req, res) => {
  try {
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

    try {
      await Promise.race([
        saveSettingsToFirestore({
          autoApproveNewUsers: db.settings.autoApproveNewUsers !== false,
          defaultTrialDays: db.settings.defaultTrialDays || 7,
          trialPolicyEnabled: true,
          ...DEFAULT_BRANDING,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore reset timed out')), 4000)),
      ]);
    } catch (fsErr) {
      console.warn('Firestore branding reset notice:', fsErr);
    }

    res.json({
      success: true,
      message: 'تم استعادة الاسم والشعار الافتراضي للسيستم بنجاح.',
      branding: DEFAULT_BRANDING,
    });
  } catch (err: any) {
    console.error('Branding reset error:', err);
    res.status(500).json({ error: 'خطأ أثناء استعادة الإعدادات: ' + (err?.message || 'خطأ غير معروف') });
  }
});

// Update Platform About Content (Overview, Vision, Mission, Custom Sections)
app.post('/api/admin/settings/about', async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string' && body.trim()) {
      try {
        body = JSON.parse(body);
      } catch {}
    }
    const {
      overviewTitle,
      overviewContent,
      visionTitle,
      visionContent,
      missionTitle,
      missionContent,
      customSections,
    } = body || {};

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

    try {
      await Promise.race([
        savePlatformAboutToFirestore(updatedAbout),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore about timed out')), 4000)),
      ]);
    } catch (fsErr) {
      console.warn('Firestore about sync notice:', fsErr);
    }

    res.json({
      success: true,
      message: 'تم حفظ وتحديث محتوى «عن المنصة والرؤية والرسالة» بنجاح في قاعدة البيانات السحابية.',
      platformAbout: updatedAbout,
    });
  } catch (err: any) {
    console.error('About update error:', err);
    res.status(500).json({ error: 'خطأ داخلي في الخادم أثناء حفظ بيانات عن المنصة: ' + (err?.message || 'خطأ غير معروف') });
  }
});

// Reset Platform About to Default
app.post('/api/admin/settings/about/reset', async (req, res) => {
  try {
    db.platformAbout = { ...DEFAULT_PLATFORM_ABOUT, updatedAt: new Date().toISOString() };
    saveDB();

    try {
      await Promise.race([
        savePlatformAboutToFirestore(db.platformAbout),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore about reset timed out')), 4000)),
      ]);
    } catch (fsErr) {
      console.warn('Firestore about reset notice:', fsErr);
    }

    res.json({
      success: true,
      message: 'تم استعادة المحتوى الافتراضي لـ «عن المنصة والرؤية والرسالة» بنجاح.',
      platformAbout: db.platformAbout,
    });
  } catch (err: any) {
    console.error('About reset error:', err);
    res.status(500).json({ error: 'خطأ أثناء استعادة محتوى عن المنصة: ' + (err?.message || 'خطأ غير معروف') });
  }
});

// Update Contact Us Info (WhatsApp numbers, Email, Phone, Address, Hours)
app.post('/api/admin/settings/contact', async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string' && body.trim()) {
      try {
        body = JSON.parse(body);
      } catch {}
    }
    const {
      whatsappNumbers,
      email,
      secondaryEmail,
      phoneNumbers,
      workHours,
      address,
      notes,
    } = body || {};

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

    try {
      await Promise.race([
        saveContactInfoToFirestore(updatedContact),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore contact timed out')), 4000)),
      ]);
    } catch (fsErr) {
      console.warn('Firestore contact sync notice:', fsErr);
    }

    res.json({
      success: true,
      message: 'تم حفظ وتحديث بيانات التواصل وأرقام الواتساب بنجاح في قاعدة البيانات السحابية.',
      contactInfo: updatedContact,
    });
  } catch (err: any) {
    console.error('Contact update error:', err);
    res.status(500).json({ error: 'خطأ أثناء تحديث بيانات التواصل: ' + (err?.message || 'خطأ غير معروف') });
  }
});

// Reset Contact Info to Default
app.post('/api/admin/settings/contact/reset', async (req, res) => {
  try {
    db.contactInfo = { ...DEFAULT_CONTACT_INFO, updatedAt: new Date().toISOString() };
    saveDB();

    try {
      await Promise.race([
        saveContactInfoToFirestore(db.contactInfo),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore contact reset timed out')), 4000)),
      ]);
    } catch (fsErr) {
      console.warn('Firestore contact reset notice:', fsErr);
    }

    res.json({
      success: true,
      message: 'تمت استعادة بيانات التواصل الافتراضية بنجاح.',
      contactInfo: db.contactInfo,
    });
  } catch (err: any) {
    console.error('Contact reset error:', err);
    res.status(500).json({ error: 'خطأ أثناء استعادة بيانات التواصل: ' + (err?.message || 'خطأ غير معروف') });
  }
});

// Update default trial days setting
app.post('/api/admin/settings/trial', async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string' && body.trim()) {
      try {
        body = JSON.parse(body);
      } catch {}
    }
    const { defaultTrialDays } = body || {};
    const days = parseInt(String(defaultTrialDays), 10);
    if (isNaN(days) || days < 1) {
      return res.status(400).json({ error: 'يرجى إدخال عدد أيام تجريبية صالح (يوم واحد على الأقل)' });
    }

    if (!db.settings) {
      db.settings = { autoApproveNewUsers: true, defaultTrialDays: 7, trialPolicyEnabled: true };
    }
    db.settings.defaultTrialDays = days;
    saveDB();

    try {
      await Promise.race([
        saveSettingsToFirestore({
          autoApproveNewUsers: db.settings.autoApproveNewUsers !== false,
          defaultTrialDays: days,
          trialPolicyEnabled: true,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore trial timed out')), 4000)),
      ]);
    } catch (fsErr) {
      console.warn('Firestore trial sync notice:', fsErr);
    }

    res.json({
      success: true,
      defaultTrialDays: days,
      message: `تم تحديد الفترة التجريبية الافتراضية للحسابات الجديدة إلى ${days} أيام بنجاح وحفظها سحابياً.`,
    });
  } catch (err: any) {
    console.error('Trial update error:', err);
    res.status(500).json({ error: 'خطأ أثناء تحديث الفترة التجريبية: ' + (err?.message || 'خطأ غير معروف') });
  }
});

// Update auto-approve setting
app.post('/api/admin/settings/auto-approve', async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string' && body.trim()) {
      try {
        body = JSON.parse(body);
      } catch {}
    }
    const { enabled } = body || {};
    if (!db.settings) {
      db.settings = { autoApproveNewUsers: true, defaultTrialDays: 7, trialPolicyEnabled: true };
    }
    db.settings.autoApproveNewUsers = Boolean(enabled);
    saveDB();

    try {
      await Promise.race([
        saveSettingsToFirestore({
          autoApproveNewUsers: db.settings.autoApproveNewUsers,
          defaultTrialDays: db.settings.defaultTrialDays || 7,
          trialPolicyEnabled: true,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore auto-approve timed out')), 4000)),
      ]);
    } catch (fsErr) {
      console.warn('Firestore auto-approve sync notice:', fsErr);
    }

    res.json({
      success: true,
      autoApprove: db.settings.autoApproveNewUsers,
      message: db.settings.autoApproveNewUsers
        ? 'تم تفعيل نظام القبول التلقائي للحسابات الجديدة بنجاح'
        : 'تم إيقاف نظام القبول التلقائي (الموافقة اليدوية مطلوبة للحسابات الجديدة)',
    });
  } catch (err: any) {
    console.error('Auto-approve update error:', err);
    res.status(500).json({ error: 'خطأ أثناء تحديث إعداد القبول التلقائي: ' + (err?.message || 'خطأ غير معروف') });
  }
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
app.get('/api/admin/users', async (req, res) => {
  try {
    if (!db.users || db.users.length === 0) {
      const cloudUsers = await fetchUsersFromFirestore();
      if (cloudUsers && Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        db.users = cloudUsers;
      } else {
        db.users = [...PERSISTENT_USERS_SEED];
      }
    }
  } catch (err) {
    console.error('Error ensuring users for /api/admin/users:', err);
    if (!db.users || db.users.length === 0) {
      db.users = [...PERSISTENT_USERS_SEED];
    }
  }
  const adminUsers = (db.users || []).map(toAdminUser);
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
  
  if (!id) {
    return res.status(400).json({ error: 'معرف المستخدم مفقود' });
  }

  // Remove from local memory if exists
  const initialLen = db.users.length;
  db.users = db.users.filter((u) => u.id !== id);
  if (db.users.length < initialLen) {
    saveDB();
  }
  
  // ALWAYS try to delete from Firestore directly, regardless of local memory
  try {
    await deleteUserFromFirestore(id);
    return res.json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (err: any) {
    console.error('Failed to delete user from Firestore:', err);
    // If it failed from Firestore but succeeded locally, consider it a partial success 
    // to avoid permanently blocking the user from deleting phantom local accounts
    if (db.users.length < initialLen) {
       return res.json({ message: 'تم حذف المستخدم محلياً (حدث خطأ في قاعدة البيانات السحابية)' });
    }
    
    // Ignore 'not found' errors from firestore when deleting
    if (err.code === 5 || err.message?.includes('not found')) {
      return res.json({ message: 'تم الحذف (المستخدم غير موجود مسبقاً في السحابة)' });
    }
    
    return res.status(500).json({ error: 'تعذر حذف المستخدم من قاعدة البيانات السحابية', details: err.message });
  }
});

// --- Laws Management Endpoints ---

// PDF Parsing & AI Legal Extraction endpoint powered directly by Gemini and local PDFParse engine
app.post('/api/admin/parse-pdf', async (req, res) => {
  try {
    const { base64Data, fileName } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'لم يتم إرسال بيانات ملف الـ PDF' });
    }

    // Basic cleaning of file name for fallback title
    const cleanTitle = (fileName || 'تشريع فلسطيني')
      .replace(/\.(pdf|docx|doc|pptx|ppt)$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();

    const buffer = Buffer.from(base64Data, 'base64');

    // 1. Direct, robust text extraction via PDFParse (works offline and parses all text streams)
    let localPdfText = '';
    let estimatedPages = 1;
    try {
      let PDFParseClass: any = null;
      try {
        const imported: any = await import('pdf-parse');
        PDFParseClass = imported?.PDFParse || imported?.default || imported;
      } catch (impErr) {
        console.warn('PDFParse dynamic import failed:', impErr);
      }
      if (PDFParseClass) {
        const parser: any = new PDFParseClass({ data: buffer });
        await parser.load();
        const rawParsedText: any = await parser.getText();
        const info: any = await parser.getInfo().catch(() => null);
        await parser.destroy().catch(() => {});
        if (rawParsedText) {
          if (rawParsedText.pages && Array.isArray(rawParsedText.pages)) {
            const pageTexts = rawParsedText.pages
              .map((p: any) => (p.text || '').trim())
              .filter(Boolean);
            if (pageTexts.length > 0) {
              localPdfText = pageTexts.join('\n\n');
            }
          }
          if (!localPdfText && typeof rawParsedText === 'string') {
            localPdfText = rawParsedText.trim();
          } else if (!localPdfText && typeof rawParsedText.text === 'string') {
            localPdfText = rawParsedText.text.trim();
          }
        }
        if (info && info.total) {
          estimatedPages = info.total;
        } else if (rawParsedText && rawParsedText.total) {
          estimatedPages = rawParsedText.total;
        }
      }
    } catch (parserErr) {
      console.warn('[AI-PDF] PDFParse direct buffer parse warning:', parserErr);
    }

    if (estimatedPages === 1) {
      try {
        const matches = buffer.toString('binary').match(/\/Type\s*\/Page[^s]/g);
        if (matches && matches.length > 0) {
          estimatedPages = matches.length;
        }
      } catch {}
    }

    // 2. Structured AI extraction via Gemini
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

    const modelsToTry = [
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
    ];

    let extractedData: {
      title: string;
      category: string;
      content: string;
      summary?: string;
    } | null = null;
    let usedModel: string = '';

    const hasDirectText = localPdfText.length > 80;

    try {
      const ai = getGemini();

      for (const model of modelsToTry) {
        try {
          console.log(`[AI-PDF] Extracting legal document via Gemini model: ${model} (directText: ${hasDirectText})`);
          
          let contentsPayload: any;
          if (hasDirectText) {
            // Trim text safely if excessively long (e.g. 100k chars) to avoid quota blowouts
            const safeText = localPdfText.length > 100000 
              ? localPdfText.slice(0, 100000) + '\n[...تم اختصار باقي المرفقات القانونية...]' 
              : localPdfText;
            contentsPayload = [
              {
                text: `${prompt}\n\nالنصوص القانونية المستخرجة من المستند:\n"""\n${safeText}\n"""`,
              },
            ];
          } else {
            contentsPayload = [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
              {
                text: prompt,
              },
            ];
          }

          let response = null;
          let retryCount = 0;
          while (retryCount < 2) {
            try {
              response = await ai.models.generateContent({
                model,
                contents: contentsPayload,
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
              break;
            } catch (err: any) {
              const isTransient =
                err?.status === 503 ||
                err?.message?.includes('503') ||
                err?.message?.includes('UNAVAILABLE') ||
                err?.message?.includes('high demand');
              if (isTransient && retryCount === 0) {
                console.log(`[AI-PDF] Model ${model} 503 spike, waiting 800ms to retry...`);
                await new Promise((resolve) => setTimeout(resolve, 800));
                retryCount++;
                continue;
              }
              throw err;
            }
          }

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
          console.warn(`[AI-PDF] Gemini call failed with model ${model}:`, err?.message || err);
        }
      }
    } catch (aiInitErr) {
      console.warn('[AI-PDF] Gemini client initialization error:', aiInitErr);
    }

    // 3. Resilient fallback to local extracted text if Gemini quota/503 prevented AI extraction
    if (!extractedData || !extractedData.content) {
      if (localPdfText && localPdfText.length > 20) {
        console.log('[AI-PDF] Using local extracted text fallback (guaranteeing zero failure)...');
        const lines = localPdfText.split('\n').map((l) => l.trim()).filter(Boolean);
        let detectedTitle = cleanTitle;
        for (const line of lines.slice(0, 8)) {
          if (
            line.length > 5 &&
            line.length < 120 &&
            (line.includes('قانون') || line.includes('قرار') || line.includes('نظام') || line.includes('تعليمات') || line.includes('مرسوم'))
          ) {
            detectedTitle = line;
            break;
          }
        }

        let detectedCategory = 'جمارك';
        const lowerText = localPdfText.toLowerCase();
        if (lowerText.includes('ضريبة دخل') || lowerText.includes('الدخل الخاضع') || lowerText.includes('ضريبة الدخل')) {
          detectedCategory = 'ضريبة دخل';
        } else if (lowerText.includes('قيمة مضافة') || lowerText.includes('القيمة المضافة') || lowerText.includes('فواتير ضريبية')) {
          detectedCategory = 'ضريبة القيمة المضافة';
        } else if (lowerText.includes('رسوم') || lowerText.includes('طوابع') || lowerText.includes('مكوس')) {
          detectedCategory = 'رسوم ومكوس';
        }

        extractedData = {
          title: detectedTitle,
          category: detectedCategory,
          content: localPdfText,
          summary: `تم استخراج نصوص هذا التشريع (${detectedTitle}) بنجاح من الملف المرفق.`,
        };
      }
    }

    if (!extractedData || (!extractedData.content && !extractedData.title)) {
      const fallbackContent = localPdfText && localPdfText.length > 5
        ? localPdfText
        : `[مستند PDF: ${cleanTitle}]\n\nتم إدراج هذا التشريع من ملف "${fileName || cleanTitle}" (${estimatedPages} صفحة).\nيمكنك تحرير أو كتابة نصوص المواد القانونية هنا مباشرة ثم حفظها في قاعدة المعرفة.`;

      let detectedCategory = 'جمارك';
      const lowerName = cleanTitle.toLowerCase();
      if (lowerName.includes('دخل') || lowerName.includes('ضريبة')) {
        detectedCategory = 'ضريبة دخل';
      } else if (lowerName.includes('مضافة') || lowerName.includes('قيمة')) {
        detectedCategory = 'ضريبة القيمة المضافة';
      } else if (lowerName.includes('رسوم') || lowerName.includes('طوابع') || lowerName.includes('مكوس')) {
        detectedCategory = 'رسوم ومكوس';
      }

      extractedData = {
        title: cleanTitle,
        category: detectedCategory,
        content: fallbackContent,
        summary: `تشريع قانوني تم تجهيزه من ملف "${fileName || cleanTitle}".`,
      };
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
      method: usedModel ? 'gemini_ai' : 'pdf_parser',
      model: usedModel || 'local_parser',
    });
  } catch (err: any) {
    console.error('Server PDF parsing error:', err);
    const cleanTitle = (req.body?.fileName || 'تشريع جديد')
      .replace(/\.pdf$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();

    return res.json({
      title: cleanTitle,
      category: 'جمارك',
      content: `[مستند: ${cleanTitle}]\n\nتم رفع هذا الملف بنجاح. يمكنك إدخال وتعديل مواده القانونية هنا.`,
      summary: `تشريع قانوني تم إدراجه من الملف: ${cleanTitle}`,
      numPages: 1,
      suggestedTitle: cleanTitle,
      suggestedCategory: 'جمارك',
      text: `[مستند: ${cleanTitle}]\n\nتم رفع هذا الملف بنجاح. يمكنك إدخال وتعديل مواده القانونية هنا.`,
      method: 'resilient_fallback',
      model: 'local',
    });
  }
});

// Lightweight text structuring endpoint for client-extracted PDF text (bypasses Vercel payload limits)
app.post('/api/admin/structure-law-text', async (req, res) => {
  try {
    const { text, fileName } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'لم يتم إرسال نص القانون' });
    }

    const cleanTitle = (fileName || 'تشريع فلسطيني')
      .replace(/\.(pdf|docx|doc|pptx|ppt)$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();

    // 1. Fast local heuristics
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    let detectedTitle = cleanTitle;
    for (const line of lines.slice(0, 15)) {
      if (
        line.length >= 6 &&
        line.length <= 150 &&
        (line.includes('قانون') ||
          line.includes('قرار بقانون') ||
          line.includes('قرار رقم') ||
          line.includes('نظام رقم') ||
          line.includes('تعليمات') ||
          line.includes('مرسوم'))
      ) {
        detectedTitle = line;
        break;
      }
    }

    let detectedCategory = 'جمارك';
    const lower = (text + ' ' + (fileName || '')).toLowerCase();
    if (
      lower.includes('ضريبة دخل') ||
      lower.includes('ضريبة الدخل') ||
      lower.includes('الدخل الخاضع')
    ) {
      detectedCategory = 'ضريبة دخل';
    } else if (
      lower.includes('قيمة مضافة') ||
      lower.includes('القيمة المضافة') ||
      lower.includes('فواتير ضريبية')
    ) {
      detectedCategory = 'ضريبة القيمة المضافة';
    } else if (
      lower.includes('رسوم') ||
      lower.includes('طوابع') ||
      lower.includes('مكوس')
    ) {
      detectedCategory = 'رسوم ومكوس';
    }

    // 2. Fast AI refinement if Gemini is available (sending small text sample, <15KB)
    try {
      const ai = getGemini();
      const sampleText = text.slice(0, 12000);
      const prompt = `أنت مستشار قانوني وتشريعي فلسطيني. بناءً على هذا النص المستخرج من وثيقة قانونية باسم "${cleanTitle}":
المطلوب إخراج كائن JSON فقط بالخصائص التالية:
1. title: العنوان الرسمي الدقيق للقانون أو التشريع أو القرار.
2. category: التصنيف الأنسب بدقة من بين ("جمارك"، "ضريبة دخل"، "ضريبة القيمة المضافة"، "رسوم ومكوس").
3. summary: ملخص تشريعي موجز ودقيق (2-3 أسطر).

نص الوثيقة:
"""
${sampleText}
"""`;

      const modelsToTry = [
        'gemini-flash-latest',
        'gemini-2.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
      ];

      for (const model of modelsToTry) {
        let retryCount = 0;
        let response = null;

        while (retryCount < 2) {
          try {
            response = await ai.models.generateContent({
              model,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    category: { type: Type.STRING },
                    summary: { type: Type.STRING },
                  },
                  required: ['title', 'category'],
                },
              },
            });
            break;
          } catch (modelErr: any) {
            const isUnavailable =
              modelErr?.status === 503 ||
              modelErr?.message?.includes('503') ||
              modelErr?.message?.includes('UNAVAILABLE') ||
              modelErr?.message?.includes('high demand');

            if (isUnavailable && retryCount === 0) {
              await new Promise((r) => setTimeout(r, 600));
              retryCount++;
              continue;
            }
            break;
          }
        }

        if (response?.text) {
          try {
            const parsed = JSON.parse(response.text);
            if (parsed && typeof parsed === 'object') {
              return res.json({
                title: parsed.title || detectedTitle,
                category: parsed.category || detectedCategory,
                summary: parsed.summary || `تم استخراج وتصنيف نصوص ${detectedTitle} بنجاح.`,
              });
            }
          } catch {}
        }
      }
    } catch (aiErr: any) {
      console.log('[AI-Structure] Note: using heuristic fallback');
    }

    return res.json({
      title: detectedTitle,
      category: detectedCategory,
      summary: `تم استخراج وتصنيف نصوص ${detectedTitle} بنجاح.`,
    });
  } catch (err: any) {
    console.error('[AI-Structure] Error:', err);
    return res.status(500).json({ error: err?.message || 'خطأ أثناء تحليل النص' });
  }
});

// Get all laws
app.get('/api/laws', (req, res) => {
  res.json({ laws: db.laws });
});

// Create multiple laws in batch
app.post('/api/laws/batch', async (req, res) => {
  try {
    const { laws } = req.body || {};
    if (!Array.isArray(laws) || laws.length === 0) {
      return res.status(400).json({ error: 'يرجى إرسال قائمة القوانين والتشريعات المطلوب إضافتها' });
    }

    const createdLaws: StoredLaw[] = [];
    const errors: string[] = [];

    for (let i = 0; i < laws.length; i++) {
      const item = laws[i];
      if (!item.title || !String(item.title).trim() || !item.content || !String(item.content).trim()) {
        errors.push(`الملف رقم ${i + 1} يفتقد إلى العنوان أو نص المواد القانونية`);
        continue;
      }

      const newLaw: StoredLaw = {
        id: 'law-' + (Date.now() + i) + '-' + Math.random().toString(36).substring(2, 6),
        title: String(item.title).trim(),
        category: item.category ? String(item.category).trim() : 'جمارك',
        content: String(item.content).trim(),
        sourceFileName: item.sourceFileName ? String(item.sourceFileName).trim() : undefined,
        sourceFileSize: item.sourceFileSize ? String(item.sourceFileSize).trim() : undefined,
        pageCount: item.pageCount ? Number(item.pageCount) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      createdLaws.push(newLaw);
      db.laws.unshift(newLaw);
    }

    cachedIndexedChunks = null;
    saveDB();

    // CRITICAL FOR VERCEL & CLOUD RUN: Explicitly await Firestore persistence before returning response
    try {
      await Promise.all(
        createdLaws.map((newLaw) =>
          saveLawToFirestore(newLaw).catch((err) => {
            console.error(`[Firestore] Error saving batch law ${newLaw.id}:`, err);
            return false;
          })
        )
      );
    } catch (firestoreErr) {
      console.error('[Firestore] Batch laws commit error:', firestoreErr);
    }

    res.status(201).json({
      message: `تمت إضافة ${createdLaws.length} تشريعات إلى قاعدة المعرفة بنجاح`,
      laws: createdLaws,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('Batch laws save error:', err);
    res.status(500).json({ error: 'تعذر حفظ دفعة القوانين: ' + (err?.message || 'خطأ غير متوقع') });
  }
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
  cachedIndexedChunks = null;
  saveDB();
  saveLawToFirestore(newLaw).catch(e => console.error('Firestore save error:', e));

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
  cachedIndexedChunks = null;

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

// ----------------------------------------------------
// Law Requests Management Endpoints (طلبات إضافة القوانين من المستفيدين)
// ----------------------------------------------------

// Get all law requests (or filtered by userId)
app.get('/api/law-requests', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!db.lawRequests) {
      db.lawRequests = [];
    }

    // Attempt to pull latest from Firestore if empty or fresh query
    if (db.lawRequests.length === 0) {
      const cloudRequests = await fetchLawRequestsFromFirestore();
      if (cloudRequests && cloudRequests.length > 0) {
        db.lawRequests = cloudRequests;
      } else {
        db.lawRequests = [...PERSISTENT_LAW_REQUESTS_SEED];
      }
    }

    let requests = db.lawRequests;
    if (userId && typeof userId === 'string') {
      requests = requests.filter((r) => r.userId === userId);
    }

    res.json({ lawRequests: requests });
  } catch (err: any) {
    console.error('Error fetching law requests:', err);
    res.status(500).json({ error: 'تعذر جلب طلبات القوانين: ' + (err?.message || '') });
  }
});

// Submit a new law request from a user / beneficiary
app.post('/api/law-requests', async (req, res) => {
  try {
    const {
      title,
      category,
      content,
      description,
      sourceFileName,
      sourceFileSize,
      pageCount,
      userId,
      userName,
      userFullName,
      userPhone,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'عنوان التشريع أو القانون مطلوب' });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: 'محتوى أو نصوص المواد القانونية مطلوبة' });
    }

    const newRequest: StoredLawRequest = {
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: String(title).trim(),
      category: category ? String(category).trim() : 'جمارك',
      content: String(content).trim(),
      description: description ? String(description).trim() : undefined,
      sourceFileName: sourceFileName ? String(sourceFileName).trim() : undefined,
      sourceFileSize: sourceFileSize ? String(sourceFileSize).trim() : undefined,
      pageCount: pageCount ? Number(pageCount) : undefined,
      userId: userId ? String(userId).trim() : undefined,
      userName: userName ? String(userName).trim() : undefined,
      userFullName: userFullName ? String(userFullName).trim() : undefined,
      userPhone: userPhone ? String(userPhone).trim() : undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!db.lawRequests) {
      db.lawRequests = [];
    }

    db.lawRequests.unshift(newRequest);
    saveDB();

    // Async save to Firestore
    saveLawRequestToFirestore(newRequest).catch((e) =>
      console.error('Firestore save law request error:', e)
    );

    res.status(201).json({
      success: true,
      message: 'تم إرسال طلب إضافة القانون بنجاح وسيقوم المشرفون بمراجعته وإدراجه في قاعدة المعرفة.',
      lawRequest: newRequest,
    });
  } catch (err: any) {
    console.error('Submit law request error:', err);
    res.status(500).json({ error: 'تعذر إرسال طلب القانون: ' + (err?.message || '') });
  }
});

// Approve law request: Moves request to main laws collection and marks request approved
app.post('/api/law-requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy, customTitle, customCategory, customContent } = req.body;

    if (!db.lawRequests) {
      db.lawRequests = [];
    }

    const reqIndex = db.lawRequests.findIndex((r) => r.id === id);
    if (reqIndex === -1) {
      return res.status(404).json({ error: 'طلب القانون غير موجود' });
    }

    const request = db.lawRequests[reqIndex];
    const finalTitle = customTitle ? String(customTitle).trim() : request.title;
    const finalCategory = customCategory ? String(customCategory).trim() : request.category;
    const finalContent = customContent ? String(customContent).trim() : request.content;

    // Create law document
    const newLaw: StoredLaw = {
      id: 'law-' + Date.now(),
      title: finalTitle,
      category: finalCategory,
      content: finalContent,
      sourceFileName: request.sourceFileName,
      sourceFileSize: request.sourceFileSize,
      pageCount: request.pageCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.laws.unshift(newLaw);
    cachedIndexedChunks = null;

    // Update request state
    request.status = 'approved';
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = reviewedBy ? String(reviewedBy).trim() : 'المشرف';
    request.updatedAt = new Date().toISOString();

    db.lawRequests[reqIndex] = request;
    saveDB();

    // Persist both law and request to Firestore
    await Promise.all([
      saveLawToFirestore(newLaw).catch((e) => console.error('Error saving approved law to firestore:', e)),
      updateLawRequestInFirestore(request.id, {
        status: 'approved',
        reviewedAt: request.reviewedAt,
        reviewedBy: request.reviewedBy,
        updatedAt: request.updatedAt,
      }).catch((e) => console.error('Error updating law request in firestore:', e)),
    ]);

    res.json({
      success: true,
      message: `تم اعتماد القانون "${newLaw.title}" وإدراجه بنجاح في قاعدة المعرفة الرسمية!`,
      law: newLaw,
      lawRequest: request,
      laws: db.laws,
      lawRequests: db.lawRequests,
    });
  } catch (err: any) {
    console.error('Approve law request error:', err);
    res.status(500).json({ error: 'تعذر اعتماد القانون: ' + (err?.message || '') });
  }
});

// Reject law request
app.post('/api/law-requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy, rejectionReason } = req.body;

    if (!db.lawRequests) {
      db.lawRequests = [];
    }

    const reqIndex = db.lawRequests.findIndex((r) => r.id === id);
    if (reqIndex === -1) {
      return res.status(404).json({ error: 'طلب القانون غير موجود' });
    }

    const request = db.lawRequests[reqIndex];
    request.status = 'rejected';
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = reviewedBy ? String(reviewedBy).trim() : 'المشرف';
    request.rejectionReason = rejectionReason ? String(rejectionReason).trim() : undefined;
    request.updatedAt = new Date().toISOString();

    db.lawRequests[reqIndex] = request;
    saveDB();

    await updateLawRequestInFirestore(request.id, {
      status: 'rejected',
      reviewedAt: request.reviewedAt,
      reviewedBy: request.reviewedBy,
      rejectionReason: request.rejectionReason,
      updatedAt: request.updatedAt,
    }).catch((e) => console.error('Error rejecting law request in firestore:', e));

    res.json({
      success: true,
      message: `تم رفض طلب القانون "${request.title}".`,
      lawRequest: request,
      lawRequests: db.lawRequests,
    });
  } catch (err: any) {
    console.error('Reject law request error:', err);
    res.status(500).json({ error: 'تعذر رفض طلب القانون: ' + (err?.message || '') });
  }
});

// Delete law request
app.delete('/api/law-requests/:id', async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id).trim();
    if (!db.lawRequests) {
      db.lawRequests = [];
    }

    const initialLen = db.lawRequests.length;
    db.lawRequests = db.lawRequests.filter((r) => r.id !== id);

    if (db.lawRequests.length < initialLen) {
      saveDB();
    }

    await deleteLawRequestFromFirestore(id).catch((e) =>
      console.error('Error deleting law request from firestore:', e)
    );

    res.json({
      success: true,
      message: 'تم حذف طلب القانون بنجاح.',
      deletedId: id,
      lawRequests: db.lawRequests,
    });
  } catch (err: any) {
    console.error('Delete law request error:', err);
    res.status(500).json({ error: 'تعذر حذف طلب القانون: ' + (err?.message || '') });
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
  saveCategoryToFirestore(newCategory).catch(e => console.error('Firestore save error:', e));

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
  const { message, username, userId } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'نص السؤال مطلوب' });
  }

  // Verify that the user is approved and not frozen/expired (by username or userId)
  const identifier = (username || '').trim().toLowerCase();
  const uid = (userId || '').trim();
  const user = db.users.find(
    (u) =>
      (identifier && u.username.toLowerCase() === identifier) ||
      (uid && (u.id === uid || String(u.id) === uid))
  );

  if (user) {
    if (user.status === 'pending') {
      return res.status(403).json({
        error: 'حسابك ما زال قيد المراجعة الإدارية. يرجى الانتظار لحين اعتماد حسابك من قبل الإدارة.',
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
        error: 'عذراً، تم تجميد حسابك لانتهاء الفترة التجريبية المحددة دون اشتراك. يرجى التواصل مع الإدارة أو الاشتراك لتفعيل الحساب ومتابعة الاستخدام.',
        status: 'frozen',
        isFrozen: true,
        subscriptionStatus: 'frozen',
        freezeReason: user.freezeReason,
        trialEndsAt: user.trialEndsAt,
      });
    }
  }

  // 0. Smart intent detection: General Knowledge/Chat vs. Legal/Tax/Customs Inquiry
  const trimmed = message.trim();
  const normalizedLower = trimmed.toLowerCase();
  const cleanedLower = trimmed.toLowerCase().replace(/[!؟?.,،:\-\s]+/g, ' ').trim();
  const isLegal = isLegalTaxCustomsQuery(trimmed);

  // Fast direct replies for common greetings, personal inquiries, and general identity questions
  if (!isLegal) {
    // 1. Identity questions like "هل انت انسان" or "انت انسان"
    if (
      /(انت انسان|أنت إنسان|هل انت انسان|هل أنت إنسان|هل انت بشر|هل أنت بشر|هل انت روبوت|هل أنت روبوت|هل انت شخص|انت شخص|هل انت ai|هل انت ذكاء اصطناعي)/i.test(
        cleanedLower
      )
    ) {
      return res.json({
        reply: `لا، أنا لست إنساناً بشرياً، بل أنا «سَنَد»؛ شخصية افتراضية ومساعد رقمي ذكي تم تطويري لتقديم الدعم الشامل والإجابة على جميع أسئلتك واستفساراتك العامة والمتخصصة بكل دقة وسهولة.`,
        isFastReply: true,
        isLegal: false,
        queryType: 'general',
      });
    }

    // 2. Name & who are you questions
    if (
      /(مين انت|من انت|من أنت|ما اسمك|ما هو اسمك|شو اسمك|عرف عن نفسك|عرفني بنفسك|شو وظيفتك|ما وظيفتك|مين طورك)/i.test(
        cleanedLower
      )
    ) {
      return res.json({
        reply: `أنا «سَنَد»، شخصيتك الافتراضية الذكية ومساعدك الرقمي المتطور. أجمع بين القدرة على تقديم استشارات دقيقة وموثقة في القوانين والضرائب والجمارك الفلسطينية، والإجابة على كافة الأسئلة العامة والمعرفية ومساعدتك في شتى المجالات.`,
        isFastReply: true,
        isLegal: false,
        queryType: 'general',
      });
    }

    // 3. How are you / check-in (including "عامل اي" and "عامل ايه")
    if (
      /(عامل ايه|عامل اي|عامل إيه|عامل إي|كيفك|كيف حالك|ازيك|إزيك|شخبارك|أخبارك|شو أخبارك|شو اخبارك|طمني عنك|طمنا عنك|كيف الأمور|كيفك اليوم)/i.test(
        cleanedLower
      )
    ) {
      return res.json({
        reply: `بصفتي شخصيتك الافتراضية ومساعدك الذكي، الحمد لله بألف خير ونعمة، شكراً لسؤالك ولطفك! أرجو أن تكون بأفضل صحة وعافية دائماً. تفضل بأي استفسار أو موضوع وسأجيبك بكل سرور.`,
        isFastReply: true,
        isLegal: false,
        queryType: 'general',
      });
    }

    // 4. Greetings
    if (
      /^(سلام|السلام عليكم|سلام عليكم|مرحبا|أهلا|اهلا|مرحباً|صباح الخير|مساء الخير|هاي|hello|hi)/i.test(
        cleanedLower
      )
    ) {
      return res.json({
        reply: `وعليكم السلام ورحمة الله وبركاته! أهلاً وسهلاً بك. أنا شخصيتك الافتراضية ومساعدك الذكي «سَنَد»، كيف يمكنني مساعدتك اليوم؟`,
        isFastReply: true,
        isLegal: false,
        queryType: 'general',
      });
    }

    // 5. Thanks
    if (/(شكرا|شكراً|تسلم|مشكور|الله يعطيك العافية|يعطيك العافية|يسلمو|بارك الله فيك)/i.test(cleanedLower)) {
      return res.json({
        reply: `العفو، على الرحب والسعة دائماً! بصفتي مساعدك الافتراضي، أنا في خدمتك في أي وقت لأي سؤال أو استفسار.`,
        isFastReply: true,
        isLegal: false,
        queryType: 'general',
      });
    }

    // 6. Mohamed Salah quick answer if queried
    if (/(محمد صلاح|فخر العرب)/i.test(cleanedLower)) {
      return res.json({
        reply: `نعم بكل تأكيد! بصفتي شخصية افتراضية مطلعة، يسرني إخبارك بأن **محمد صلاح** هو قائد المنتخب المصري ونجم نادي ليفربول الإنجليزي، ويُعد واحداً من أبرز وأعظم أساطير كرة القدم في العالم والعالم العربي.\n\nمن أبرز إنجازاته:\n• الفوز بدوري أبطال أوروبا والدوري الإنجليزي الممتاز وكأس العالم للأندية مع ليفربول.\n• الحذاء الذهبي لهداف الدوري الإنجليزي عدة مواسم.\n• جائزة أفضل لاعب في إفريقيا مرتين.\n• الهداف التاريخي لنادي ليفربول في دوري الأبطال والبريميرليج.`,
        isFastReply: true,
        isLegal: false,
        queryType: 'general',
      });
    }

    // 7. Islamic religion quick answer if queried
    if (/(الدين الإسلامي|دين الاسلام|الاسلام|الإسلام|اركان الاسلام|أركان الإسلام)/i.test(cleanedLower)) {
      return res.json({
        reply: `بصفتي شخصيتك الافتراضية ومساعدك المعرفي، يسعدني توضيح ذلك: **الدين الإسلامي** هو الرسالة الخاتمة التي أرسل الله بها خاتم الأنبياء والمرسلين نبينا محمد ﷺ رحمةً للعالمين. وهو دين التوحيد القائم على إفراد الله بالعبودية، والعدل والرحمة ومكارم الأخلاق.\n\n📌 **أركان الإسلام الخمسة:**\n1. **الشهادتان:** شهادة أن لا إله إلا الله وأن محمداً رسول الله.\n2. **إقام الصلاة:** أداء الصلوات الخمس المفروضة في أوقاتها.\n3. **إيتاء الزكاة:** حق واجب في المال للفقراء والمستحقين.\n4. **صوم رمضان:** صيام الشهر الفضيل.\n5. **حج البيت:** لمن استطاع إليه سبيلاً.\n\n📌 **أركان الإيمان الستة:**\nالإيمان بالله، وملائكته، وكتبه، ورسله، واليوم الآخر، والقدر خيره وشره.`,
        isFastReply: true,
        isLegal: false,
        queryType: 'general',
      });
    }
  }

  // 1. Organize knowledge base with smart RAG chunking ONLY if query is genuinely about laws/taxes/customs
  const laws = db.laws;
  const { prioritizedContext, fullCatalog } = isLegal
    ? buildStructuredLegalContext(message, laws)
    : { prioritizedContext: '', fullCatalog: '' };

  // 2. Focused, intelligent system instruction supporting both broad world knowledge/general conversation and highly organized legal citation
  const systemInstruction = `أنت "سَنَد"، شخصية افتراضية ومساعد ذكاء اصطناعي شامل ومتطور (وخبير متخصص في القوانين والضرائب والجمارك في دولة فلسطين).

تعليمات الإجابة وقواعد السلوك الصارمة:
1. **الأسئلة العامة والمعرفة العامة والدردشة (أي شيء خارج القوانين والضرائب والجمارك):**
   - أجب بوضوح تام كـ «شخصية افتراضية» ومساعد رقمي ذكي (لست بشراً).
   - أجب على أي سؤال أو موضوع عام يسألك عنه المستخدم في أي مجال (مثل: الدين الإسلامي وتفاصيله، الشخصيات مثل محمد صلاح ومسيرته، كرة القدم، الرياضة، العلوم، التاريخ، التكنولوجيا، الثقافة، الرياضيات، اللغات، أو التحية والدردشة اليومية).
   - إذا سألك المستخدم "هل أنت إنسان؟" أو "أنت إنسان؟": أجب بنفي صريح وواضح: "لا، أنا لست إنساناً، بل أنا «سَنَد»؛ شخصية افتراضية ومساعد ذكاء اصطناعي ذكي مصمم لمساعدتك...".
   - **ممنوع بتاتاً ومطلقاً** إدراج أو ذكر أو حشر أي نصوص أو مواد أو مراسيم قانونية في الإجابات العامة غير القانونية! يجب أن تكون إجابتك ذكية، مباشرة، وشاملة.

2. **الاستفسارات والأسئلة عن القوانين والضرائب والجمارك (فلسطين):**
   عندما يسألك المستخدم عن أي قانون أو ضريبة أو جمرك:
   - **طلب التفاصيل الإضافية أولاً قبل العرض:**
     إذا كان سؤال المستخدم عاماً أو تنقصه معطيات محددة، اطلب بلطف وتنسيق واضح تزويدك بالتفاصيل الإضافية (مثل: سنة المعاملة، صفة المكلف: فرد طبيعي أم شركة، طبيعة النشاط أو نوع السلعة).
   - **التبسيط أولاً وعدم التعقيد:**
     اشرح الحكم والمفهوم المطلوب بلغة عربية مبسطة وعملية جداً ومباشرة وسهلة الفهم دون تعقيد أو حشو مصطلحات مبهمة.
   - **تحديد المادة والقانون والتوقيت بدقة وبشكل مختصر ومرتب:**
     اذكر بدقة:
     * القانون المصدر الرسمي.
     * توقيت وسنة الصدور والنفاذ (مثال: لسنة 2022م).
     * رقم المادة والفقرة المحددة فقط المعنية بالاستفسار.
     * مضمون المادة باختصار شديد وبشكل موجز ومرتب.
     * **ممنوع نهائياً سرد أو نسخ نص القانون كاملاً أو إغراق المستخدم بمواد طويلة غير مطلوبة.**

${prioritizedContext ? `\nالمواد التشريعية المرجعية المعتمدة ذات الصلة:\n${prioritizedContext}\n` : ''}
${fullCatalog ? `\nقائمة التشريعات المتاحة:\n${fullCatalog}` : ''}`;

  try {
    const ai = getGemini();
    // Valid candidate models in optimal priority from gemini-api skill
    const candidateConfigs = [
      {
        model: 'gemini-flash-latest',
        config: {
          systemInstruction,
          temperature: 0.6,
        },
      },
      {
        model: 'gemini-3.1-flash-lite',
        config: {
          systemInstruction,
          temperature: 0.6,
        },
      },
      {
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction,
          temperature: 0.6,
        },
      },
    ];
    let response = null;
    let lastErr = null;

    // Build multi-turn conversational contents if conversationHistory is sent (keep last 4 messages for rapid processing)
    let multiTurnContents: any[] = [];
    const rawHistory = (req.body as any)?.conversationHistory;
    if (Array.isArray(rawHistory) && rawHistory.length > 0) {
      const recentHistory = rawHistory.slice(-4);
      for (const msg of recentHistory) {
        if (!msg || typeof msg.text !== 'string' || !msg.text.trim()) continue;
        const role = msg.sender === 'user' ? 'user' : 'model';
        if (multiTurnContents.length > 0 && multiTurnContents[multiTurnContents.length - 1].role === role) {
          multiTurnContents[multiTurnContents.length - 1].parts[0].text += `\n${msg.text}`;
        } else {
          multiTurnContents.push({
            role,
            parts: [{ text: msg.text }],
          });
        }
      }
    }

    // Ensure conversation starts with 'user'
    while (multiTurnContents.length > 0 && multiTurnContents[0].role !== 'user') {
      multiTurnContents.shift();
    }

    // Ensure conversation ends with current user message
    if (
      multiTurnContents.length === 0 ||
      multiTurnContents[multiTurnContents.length - 1].role !== 'user'
    ) {
      multiTurnContents.push({
        role: 'user',
        parts: [{ text: message }],
      });
    } else if (multiTurnContents[multiTurnContents.length - 1].parts[0]?.text !== message) {
      multiTurnContents.push({
        role: 'user',
        parts: [{ text: message }],
      });
    }

    const contentsToSend = multiTurnContents.length > 1 ? multiTurnContents : message;

    for (const candidate of candidateConfigs) {
      let retryCount = 0;
      while (retryCount < 2) {
        try {
          response = await ai.models.generateContent({
            model: candidate.model,
            contents: contentsToSend,
            config: candidate.config,
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
          const isUnavailable =
            e?.status === 503 ||
            e?.message?.includes('503') ||
            e?.message?.includes('UNAVAILABLE') ||
            e?.message?.includes('high demand');

          if (isUnavailable && retryCount === 0) {
            console.log(`[AI Model] ${candidate.model} 503 spike, waiting 600ms retry...`);
            await new Promise((r) => setTimeout(r, 600));
            retryCount++;
            continue;
          }

          console.log(`[AI Model] ${candidate.model} note: ${isQuotaError ? 'Quota limit' : isUnavailable ? 'Unavailable 503' : 'Fallback'}, trying next...`);
          
          // If it failed possibly due to multi-turn contents structure, retry once with simple message
          if (typeof contentsToSend !== 'string') {
            try {
              response = await ai.models.generateContent({
                model: candidate.model,
                contents: message,
                config: candidate.config,
              });
              if (response?.text) {
                break;
              }
            } catch {}
          }
          break;
        }
      }
      if (response?.text) {
        break;
      }
    }

    const suggestedDetails = isLegal
      ? [
          'صفة المكلف: فرد طبيعي (موظف/مهني)',
          'صفة المكلف: شركة تجارية/مساهمة',
          'سنة المعاملة: 2024م',
          'شحنة أو طرد بريدي شخصي',
        ]
      : undefined;

    if (response?.text) {
      return res.json({
        reply: response.text,
        isLegal,
        queryType: isLegal ? 'legal' : 'general',
        suggestedDetails,
      });
    }

    // Graceful Knowledge Base Fallback if Gemini quota is completely exhausted
    console.log('All Gemini models deferred, using smart knowledge retrieval fallback.');
    const fallbackAnswer = generateKnowledgeFallback(message, db.laws);
    return res.json({
      reply: fallbackAnswer,
      isFallback: true,
      isLegal,
      queryType: isLegal ? 'legal' : 'general',
      suggestedDetails,
    });
  } catch (error: any) {
    console.error('Error in AI handler, using fallback:', error?.message || error);
    // Even if client creation fails, provide direct database/general response
    const fallbackAnswer = generateKnowledgeFallback(message, db.laws);
    return res.json({
      reply: fallbackAnswer,
      isFallback: true,
      isLegal,
      queryType: isLegal ? 'legal' : 'general',
      suggestedDetails: isLegal
        ? [
            'صفة المكلف: فرد طبيعي (موظف/مهني)',
            'صفة المكلف: شركة تجارية/مساهمة',
            'سنة المعاملة: 2024م',
            'شحنة أو طرد بريدي شخصي',
          ]
        : undefined,
    });
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
      saveConversationToFirestore(cloudConv).catch(e => console.error('Firestore save error:', e));
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

let cachedIndexedChunks: { lawsCount: number; chunks: LegalChunk[] } | null = null;

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

// Helper to extract law issuance year / date from title or text
function extractLawTiming(title: string, text: string): string {
  const matchYear = title.match(/(?:لسنة|عام)\s*(\d{4})[م|هـ]?/i) || text.match(/(?:لسنة|عام)\s*(\d{4})[م|هـ]?/i);
  if (matchYear && matchYear[1]) {
    return `لسنة ${matchYear[1]}م`;
  }
  const matchPlainYear = title.match(/\b(19\d{2}|20\d{2})\b/);
  if (matchPlainYear && matchPlainYear[1]) {
    return `لسنة ${matchPlainYear[1]}م`;
  }
  const matchDate = text.match(/بتاريخ\s*([\d\/\.\-]+)/i);
  if (matchDate && matchDate[1]) {
    return `بتاريخ ${matchDate[1]}`;
  }
  return 'وفقاً لآخر تعديل معتمد ونافذ';
}

// Extracts a concise summary snippet of the article without dumping the whole content
function extractConciseSummary(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => Boolean(l) && !l.startsWith('مادة (') && !l.startsWith('المادة ('));

  if (lines.length === 0) {
    return text.substring(0, 180).trim() + (text.length > 180 ? '...' : '');
  }

  const keyLines = lines.slice(0, 3).join(' ');
  if (keyLines.length > 250) {
    return keyLines.substring(0, 240).trim() + '...';
  }
  return keyLines;
}

// Check if a query has genuine legal, tax, or customs intent
function isLegalTaxCustomsQuery(query: string): boolean {
  if (!query || typeof query !== 'string') return false;
  const q = query.trim().toLowerCase();
  const cleaned = q.replace(/[!؟?.,،:\-\s]+/g, ' ');

  // 1. Explicit conversational greetings, personal inquiries, and identity questions
  if (
    /^(عامل ايه|عامل اي|عامل إيه|عامل إي|ازيك|إزيك|كيفك|كيف حالك|شخبارك|أخبارك|شو أخبارك|شو اخبارك|طمني عنك|طمنا عنك|كيف الأمور|صباح الخير|مساء الخير|سلام|السلام عليكم|سلام عليكم|مرحبا|مرحباً|أهلا|اهلا|هاي|hello|hi)\b/i.test(
      cleaned
    )
  ) {
    return false;
  }

  // 2. Identity & bot nature questions
  if (
    /(انت انسان|أنت إنسان|هل انت انسان|هل أنت إنسان|هل انت بشر|هل أنت بشر|هل انت روبوت|هل أنت روبوت|هل انت شخص|انت شخص|هل انت ai|هل انت ذكاء اصطناعي|من انت|مين انت|من أنت|ما اسمك|شو اسمك|عرفني بنفسك|عرف عن نفسك|ما وظيفتك|شو وظيفتك|مين طورك|مين برمجك)/i.test(
      cleaned
    )
  ) {
    return false;
  }

  // 3. Clear non-legal general knowledge topics (religion, personalities, sports, science, culture, history, geography)
  if (
    /(محمد صلاح|ميسي|رونالدو|كرة القدم|الرياضة|الدين الإسلامي|دين الاسلام|الإسلام|الاسلام|القرآن|الحديث|الصلاة|الصيام|الحج|الزكاة|النبي|الرسول|الصحابة|الفيزياء|الكيمياء|الطب|الفلك|الفضاء|الطقس|التاريخ|الجغرافيا|الفلسفة|البرمجة|الرياضيات|معنى كلمة|قصة|نكتة|شعر|طبخ|عاصمة|من هو|من هي|ما هو|ما هي|ماذا تعرف عن)/i.test(
      cleaned
    ) &&
    !/(قانون|قوانين|تشريع|تشريعات|مرسوم|قرار بقانون|مادة|مواد|لائحة|لوائح|ضريبة|ضرائب|ضريبي|ضريبية|جمارك|جمرك|جمركي|جمركية|رسم جمركي|رسوم جمركية|تعرفة جمركية|طرد بريدي|سجل تجاري|مقاصة|إعفاء ضريبي|فاتورة ضريبية)/i.test(
      cleaned
    )
  ) {
    return false;
  }

  // 4. Strict legal & tax keywords
  const legalTermsRegex = /(قانون|قوانين|تشريع|تشريعات|مرسوم|قرار بقانون|مادة|مواد|لائحة|لوائح|ضريبة|ضرائب|ضريبي|ضريبية|جمارك|جمرك|جمركي|جمركية|بيان جمركي|رسوم جمركية|تعرفة جمركية|طرد بريدي|إعفاء ضريبي|إعفاءات|دخل كلي|ضريبة دخل|قيمة مضافة|مكوس|غرامة تأخير|عقوبة|محكمة الصلح|وزارة المالية|دائرة الجمارك|مكافحة غسل الأموال|فحص ضريبي|تهرب ضريبي|سجل تجاري|فاتورة ضريبية|مقاصة)/i;

  return legalTermsRegex.test(q);
}

const ARABIC_STOPWORDS = new Set([
  'هل', 'ما', 'ماذا', 'من', 'في', 'على', 'إلى', 'الي', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك',
  'هو', 'هي', 'هم', 'نحن', 'أنت', 'انت', 'انا', 'أنا', 'كان', 'كانت', 'يكون', 'تكون', 'ليس',
  'لن', 'لم', 'أن', 'ان', 'لو', 'إذا', 'اذا', 'كيف', 'أين', 'اين', 'متى', 'كم', 'لماذا', 'ليه',
  'شو', 'ايش', 'أي', 'اي', 'بعض', 'كل', 'غير', 'سوى', 'فقط', 'حتى', 'حيث', 'حين', 'قبل', 'بعد',
  'عند', 'لدى', 'مثل', 'نحو', 'ضد', 'حول', 'دون', 'قد', 'تم', 'يتم', 'قام', 'قامت', 'قال', 'قالت',
  'ذكر', 'عرف', 'تعرف', 'أود', 'اريد', 'أريد', 'استفسار', 'سؤال', 'تخبرني', 'تقول', 'اعرف', 'أعرف',
  'بدي', 'عايز', 'انسان', 'إنسان', 'شخص', 'بشر', 'صلاح', 'محمد', 'شيء', 'حاجة', 'ممكن', 'مرحبا', 'شكرا'
]);

// Build structured legal context with high-priority chunks highlighted at the top
function buildStructuredLegalContext(
  query: string,
  laws: StoredLaw[]
): { prioritizedContext: string; fullCatalog: string } {
  if (!isLegalTaxCustomsQuery(query) || laws.length === 0) {
    return {
      prioritizedContext: '',
      fullCatalog: '',
    };
  }

  const normalizedQuery = query.toLowerCase();
  const rawWords = normalizedQuery
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !ARABIC_STOPWORDS.has(w));

  if (rawWords.length === 0) {
    return {
      prioritizedContext: '',
      fullCatalog: '',
    };
  }

  // Retrieve or compute indexed chunks
  let baseChunks: LegalChunk[];
  if (cachedIndexedChunks && cachedIndexedChunks.lawsCount === laws.length) {
    baseChunks = cachedIndexedChunks.chunks;
  } else {
    baseChunks = [];
    for (const law of laws) {
      const lawChunks = chunkLawContent(law);
      for (const chunk of lawChunks) {
        baseChunks.push(chunk);
      }
    }
    cachedIndexedChunks = { lawsCount: laws.length, chunks: baseChunks };
  }

  // Score individual chunks across all laws
  const scoredChunks: LegalChunk[] = [];
  for (const chunk of baseChunks) {
    const fullText = (chunk.lawTitle + ' ' + chunk.category + ' ' + chunk.sectionHeader + ' ' + chunk.text).toLowerCase();
    let score = 0;
    for (const word of rawWords) {
      if (fullText.includes(word)) {
        score += 1;
        // Extra weight if keyword is in the header or title
        if (chunk.sectionHeader.toLowerCase().includes(word) || chunk.lawTitle.toLowerCase().includes(word)) {
          score += 2;
        }
      }
    }
    if (score >= 2) {
      scoredChunks.push({ ...chunk, score });
    }
  }

  scoredChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  const topChunks = scoredChunks.slice(0, 4);

  let prioritizedContext = '';
  if (topChunks.length > 0) {
    prioritizedContext = `[المواد والبنود القانونية المعتمدة المسترجعة ذات الصلة الوثيقة باستفسار المستخدم (اعتمد عليها واذكر رقم المادة وتوقيتها باختصار وتبسيط)]:\n` +
      topChunks
        .map(
          (c, idx) =>
            `--- مادة/بند ذو أولوية (${idx + 1}) ---\nالتشريع: ${c.lawTitle} [${c.category}]\nالموضع/البند: ${c.sectionHeader}\n${c.text}`
        )
        .join('\n\n');
  }

  // Provide a compact index of available laws
  const fullCatalog = `[قائمة التشريعات والقوانين المعتمدة في قاعدة المعرفة (${laws.length} تشريع)]:\n` +
    laws
      .slice(0, 15)
      .map((l, index) => {
        return `${index + 1}. ${l.title} (${l.category})`;
      })
      .join('\n');

  return { prioritizedContext, fullCatalog };
}

// Helper for local knowledge retrieval when API quota is constrained
function generateKnowledgeFallback(query: string, laws: StoredLaw[]): string {
  const trimmed = query.trim().toLowerCase();
  const cleaned = trimmed.replace(/[!؟?.,،:\-\s]+/g, ' ');

  // 1. Casual Greetings & Check-ins ("عامل اي", "عامل ايه", "ازيك", etc.)
  if (
    /^(عامل ايه|عامل اي|عامل إيه|عامل إي|ازيك|إزيك|كيفك|كيف حالك|شخبارك|أخبارك|شو أخبارك|شو اخبارك|طمني عنك|طمنا عنك|كيف الأمور|كيفك اليوم)/i.test(
      cleaned
    )
  ) {
    return `الحمد لله بألف خير ونعمة، شكراً لسؤالك ولطفك! أرجو أن تكون بأفضل حال وعافية دائماً.\n\nتفضل بأي سؤال أو موضوع تريد الحديث عنه، سواء كان سؤالاً عاماً، أو استفساراً متخصصاً، وأنا جاهز لمساعدتك بكل سرور.`;
  }

  if (
    /^(سلام|السلام عليكم|سلام عليكم|مرحبا|مرحباً|أهلا|اهلا|صباح الخير|مساء الخير|هاي|hello|hi)\b/i.test(cleaned)
  ) {
    return `وعليكم السلام ورحمة الله وبركاته! أهلاً وسهلاً بك. أنا «سَنَد»، كيف أستطيع مساعدتك اليوم؟`;
  }

  if (/^(شكرا|شكراً|تسلم|مشكور|الله يبارك فيك|يعطيك العافية|يسلمو|بارك الله فيك)/i.test(cleaned)) {
    return `العفو على الرحب والسعة دائماً! أنا في خدمتك في أي وقت لأي سؤال أو استفسار.`;
  }

  // 2. Identity & "Are you human?" questions
  if (
    /(انت انسان|أنت إنسان|هل انت انسان|هل أنت إنسان|هل انت بشر|هل أنت بشر|هل انت روبوت|هل أنت روبوت|هل انت شخص|انت شخص|هل انت ai|هل انت ذكاء اصطناعي)/i.test(
      cleaned
    )
  ) {
    return `لا، أنا لست إنساناً بشرياً، بل أنا «سَنَد»؛ شخصية افتراضية ومساعد رقمي ذكي تم تطويري لتقديم الدعم الشامل والإجابة على جميع أسئلتك واستفساراتك العامة والمتخصصة بكل دقة وسهولة.`;
  }

  if (
    /^(من انت|مين انت|من أنت|ما اسمك|شو اسمك|عرفني بنفسك|عرف عن نفسك|ما وظيفتك|شو وظيفتك|مين طورك)\b/i.test(cleaned)
  ) {
    return `أنا «سَنَد»، شخصيتك الافتراضية الذكية ومستشارك التفاعلي. أجمع بين القدرة على تقديم استشارات دقيقة وموثقة في القوانين والضرائب والجمارك في فلسطين، والإجابة على كافة الأسئلة العامة والمعرفية في شتى المجالات.`;
  }

  // 3. Mohamed Salah
  if (/محمد صلاح|فخر العرب/i.test(cleaned)) {
    return `نعم بكل تأكيد! بصفتي شخصية افتراضية مطلعة، يسرني إخبارك بأن **محمد صلاح** هو قائد المنتخب المصري الأول ونجم نادي ليفربول الإنجليزي، ويُعد واحداً من أبرز وأعظم أساطير كرة القدم في تاريخ العالم العربي والدوري الإنجليزي الممتاز والعالم.\n\n📌 **أبرز محطاته وإنجازاته:**\n• حقق مع نادي ليفربول ألقاباً كبرى: دوري أبطال أوروبا، الدوري الإنجليزي الممتاز، كأس السوبر الأوروبي، وكأس العالم للأندية.\n• فاز بالحذاء الذهبي لهداف الدوري الإنجليزي عدة مواسم.\n• فاز بجائزة أفضل لاعب في إفريقيا (الكاف) عامي 2017 و2018.\n• الهداف التاريخي لنادي ليفربول في دوري أبطال أوروبا والبريميرليج.`;
  }

  // 4. Islamic religion
  if (/الدين الإسلامي|دين الاسلام|الاسلام|الإسلام|اركان الاسلام|أركان الإسلام/i.test(cleaned) && !/قانون|ضريبة|جمارك/.test(cleaned)) {
    return `بصفتي شخصيتك الافتراضية ومساعدك المعرفي، يسعدني توضيح ذلك: **الدين الإسلامي** هو الرسالة الخاتمة التي أرسل الله بها خاتم الأنبياء والمرسلين نبينا محمد ﷺ رحمةً للعالمين. وهو دين التوحيد القائم على إفراد الله سبحانه بالعبودية، والعدل والرحمة ومكارم الأخلاق.\n\n📌 **أركان الإسلام الخمسة:**\n1. **الشهادتان:** شهادة أن لا إله إلا الله، وأن محمداً رسول الله.\n2. **إقام الصلاة:** أداء الصلوات الخمس المفروضة في أوقاتها.\n3. **إيتاء الزكاة:** حق واجب في أموال الأغنياء يُدفع للفقراء والمستحقين.\n4. **صوم رمضان:** صيام شهر رمضان المبارك.\n5. **حج البيت:** قصد الكعبة المشرفة لأداء المناسك لمن استطاع إليه سبيلاً.\n\n📌 **أركان الإيمان الستة:**\nالإيمان بالله، وملائكته، وكتبه، ورسله، واليوم الآخر، والقدر خيره وشره.`;
  }

  // 5. If this is NOT a legal query, provide a friendly, intelligent general assistant answer
  if (!isLegalTaxCustomsQuery(query)) {
    return `أهلاً بك! بصفتي شخصيتك الافتراضية ومساعدك الذكي «سَنَد»، يسعدني جداً الإجابة على أي سؤال أو استفسار عام في أي مجال (علوم، تاريخ، ثقافة، رياضة، لغات، أو نقاش يومي).\n\nتفضل بطرح سؤالك بمزيد من التفصيل وسأجيبك فوراً بكل وضوح وسلاسة دون أي تعقيد.`;
  }

  // 6. LEGAL / TAX / CUSTOMS QUERY
  const rawWords = query.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !ARABIC_STOPWORDS.has(w));

  if (rawWords.length === 0) {
    return `📋 **يرجى تزويدي بالتفاصيل الإضافية التالية قبل العرض:**\n1. سنة المعاملة المالية أو الضريبية.\n2. صفة المكلف (فرد طبيعي أم شركة).\n3. نوع السلعة أو الخدمة موضوع الاستفسار.\n\nتفضل بتحديد هذه التفاصيل وسأصوغ لك الحكم القانوني بدقة مع ذكر المادة والقانون المصدر.`;
  }

  // Score individual chunks across all laws to find specific articles
  const allChunks: LegalChunk[] = [];
  for (const law of laws) {
    const lawChunks = chunkLawContent(law);
    for (const chunk of lawChunks) {
      const fullText = (chunk.lawTitle + ' ' + chunk.category + ' ' + chunk.sectionHeader + ' ' + chunk.text).toLowerCase();
      let score = 0;
      for (const word of rawWords) {
        if (fullText.includes(word)) score += 1;
      }
      chunk.score = score;
      if (score >= 2) allChunks.push(chunk);
    }
  }

  allChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  const topChunk = allChunks[0];

  if (topChunk && (topChunk.score || 0) >= 2) {
    const timing = extractLawTiming(topChunk.lawTitle, topChunk.text);
    const summary = extractConciseSummary(topChunk.text);

    let result = `📋 **لتحديد الحكم الدقيق لحالتك الخاصة، يرجى تزويدي بالتفاصيل الإضافية التالية أولاً:**\n`;
    result += `• **سنة المعاملة:** (لتحديد النظام المالي أو جدول الشرائح الساري في تلك السنة).\n`;
    result += `• **صفة المكلف:** (هل أنت فرد طبيعي/موظف أم شركة تجارية/مساهمة؟).\n`;
    result += `• **طبيعة النشاط أو السلعة:** (لتطبيق الإعفاءات أو النسب الخاصة بالنشاط).\n\n`;
    result += `---\n\n`;
    result += `⚖️ **السند القانوني والمادة المحددة:**\n`;
    result += `• **القانون المصدر:** ${topChunk.lawTitle} (${timing})\n`;
    result += `• **المادة المحددة:** ${topChunk.sectionHeader}\n\n`;
    result += `💡 **خلاصة الحكم القانوني باختصار:**\n`;
    result += `${summary}\n\n`;
    result += `*(تم استخراج السند والمادة باختصار وبشكل مرتب دون الحاجة لسرد مجلدات القانون كاملة)*`;
    return result;
  }

  let promptForDetails = `📋 **لتحديد الحكم الدقيق لحالتك الخاصة، يرجى تزويدي بالتفاصيل الإضافية التالية:**\n`;
  promptForDetails += `• سنة المعاملة المالية أو التصريح.\n`;
  promptForDetails += `• صفة المكلف (فرد طبيعي أم شركة).\n`;
  promptForDetails += `• رقم المادة أو المعاملة الجمركية/الضريبية المستهدفة.\n\n`;
  promptForDetails += `⚖️ **إفادة استشارية أولية:** لم يتم العثور على مادة مطابقة تماماً بهذا اللفظ في قاعدة التشريعات المسجلة حالياً. بمجرد تزويدنا بالتفاصيل أعلاه سنصيغ لك الحكم مرتباً ومقتضباً مع سنده القانوني مباشرة.`;
  return promptForDetails;
}


// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express Error:', err?.stack || err?.message || err);
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'حجم البيانات كبير جداً أو التنسيق غير صحيح. يرجى اختيار صورة أصغر حجماً.' });
  }
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({ error: 'حجم الملف أو البيانات المرسلة كبير جداً. الحد الأقصى المسموح به هو 200 ميجابايت.' });
  }
  res.status(500).json({ error: 'خطأ داخلي في الخادم: ' + (err?.message || 'خطأ غير معروف') });
});

  // Vite middleware & Static serving (Standalone execution only)
async function startServer() {
  const isServerless = Boolean(
    process.env.VERCEL || 
    process.env.VERCEL_ENV ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME || 
    process.env.NETLIFY ||
    process.env.FUNCTION_NAME
  );

  // In serverless environments, Vercel/Cloud functions invoke Express app directly
  if (isServerless) {
    return;
  }

  try {
    if (process.env.NODE_ENV !== 'production') {
      try {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        app.use(vite.middlewares);
      } catch (viteErr) {
        console.warn('Vite dev middleware not loaded:', viteErr);
      }
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`⚡ Server listening on port ${PORT} (immediate readiness)`);
        // Non-blocking background sync with Firestore Cloud Database
        syncWithFirestore().catch((err) => {
          console.error('Background Firestore sync error:', err);
        });
      });
    }
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

// Only start standalone server if executed directly as the main entry point
const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.VERCEL_ENV ||
  process.env.NOW_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.NETLIFY ||
  process.env.FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env._HANDLER
);

const isMainEntry = Boolean(
  process.argv[1] && (
    process.argv[1].endsWith('server.ts') || 
    process.argv[1].endsWith('server.cjs') || 
    process.argv[1].endsWith('server.js')
  )
);

if (!isServerless && isMainEntry) {
  startServer().catch((err) => {
    console.error('Unhandled error in startServer:', err);
  });
}

export default app;
