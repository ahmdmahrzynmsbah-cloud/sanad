import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { PDFParse } from 'pdf-parse';
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
} from './server/firestore';

dotenv.config();

const app = express();
const PORT = 3000;

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

// Path to JSON database
const DATA_DIR = path.join(process.cwd(), 'data');
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
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
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
}

interface DBData {
  users: StoredUser[];
  laws: StoredLaw[];
  categories?: StoredCategory[];
  settings?: DBSettings;
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
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(content) as DBData;
      if (!data.settings) {
        data.settings = { autoApproveNewUsers: true };
      }
      if (!data.categories || data.categories.length === 0) {
        data.categories = [...DEFAULT_CATEGORIES];
      }
      return data;
    } catch {
      // Fallback
    }
  }

  const initialData: DBData = {
    settings: {
      autoApproveNewUsers: true,
    },
    categories: [...DEFAULT_CATEGORIES],
    users: [
      {
        id: 'user-demo-pending',
        username: 'ahmad_khalil',
        password: 'password123',
        role: 'user',
        status: 'pending',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'user-demo-approved',
        username: 'tariq_pal',
        password: 'password123',
        role: 'user',
        status: 'approved',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        reviewedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      },
    ],
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

async function syncWithFirestore() {
  try {
    console.log('🔄 Initializing Cloud Firestore sync in background...');
    initFirestore();
    if (!db.categories || db.categories.length === 0) {
      db.categories = [...DEFAULT_CATEGORIES];
    }
    await seedFirestoreIfEmpty(db.users, db.laws, db.categories);

    // Fetch users, laws, and categories concurrently in parallel
    const [cloudUsers, cloudLaws, cloudCategories] = await Promise.all([
      fetchUsersFromFirestore(),
      fetchLawsFromFirestore(),
      fetchCategoriesFromFirestore(),
    ]);

    let changed = false;

    if (cloudUsers && cloudUsers.length > 0) {
      db.users = cloudUsers;
      changed = true;
      console.log(`✅ Loaded ${cloudUsers.length} users from Cloud Firestore.`);
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
    createdAt: new Date().toISOString(),
    ...(isAutoApprove ? { reviewedAt: new Date().toISOString() } : {}),
  };

  db.users.push(newUser);
  saveDB();
  await saveUserToFirestore(newUser);

  return res.status(201).json({
    message: isAutoApprove
      ? 'تم إنشاء الحساب واعتماده تلقائياً بنجاح! يمكنك الآن تسجيل الدخول مباشرة واستخدام الشات.'
      : 'تم إنشاء الحساب بنجاح، وهو الآن قيد المراجعة بانتظار موافقة المسؤول.',
    isAutoApproved: isAutoApprove,
    user: {
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      phone: newUser.phone,
      status: newUser.status,
      role: newUser.role,
    },
  });
});

// User Login: Checks credentials and approval status (supports login by username or phone)
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

  // Check user status
  if (user.status === 'pending') {
    return res.status(403).json({
      error: 'حسابك قيد المراجعة حالياً، ولا يمكنك استخدام البوت إلا بعد موافقة المسؤول.',
      status: 'pending',
      username: user.username,
    });
  }

  if (user.status === 'rejected') {
    return res.status(403).json({
      error: 'تم رفض طلب حسابك من قِبل إدارة النظام. يتعذر تسجيل الدخول.',
      status: 'rejected',
      username: user.username,
    });
  }

  return res.json({
    message: 'تم تسجيل الدخول بنجاح',
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      role: user.role,
    },
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

// Fast Consolidated Admin Initial Data (Single roundtrip for ultra-fast portal load)
app.get('/api/admin/init', (req, res) => {
  const safeUsers = db.users.map(({ password, recoveryCode, ...rest }) => rest);
  res.json({
    users: safeUsers,
    laws: db.laws,
    categories: db.categories || [],
    autoApprove: db.settings?.autoApproveNewUsers !== false,
    systemStatus: {
      status: 'online',
      database: 'Google Cloud Firestore (Enterprise NoSQL)',
      provider: 'Cloud Firestore',
      projectId: 'pos1-d562e',
      databaseId: 'ai-studio-6d29bd6f-50fc-4475-8e3b-86e0db64d605',
      usersCount: db.users.length,
      lawsCount: db.laws.length,
      categoriesCount: (db.categories || []).length,
      timestamp: new Date().toISOString(),
    },
  });
});

// --- Admin Endpoints ---

// Get admin settings (Auto-approval status)
app.get('/api/admin/settings', (req, res) => {
  res.json({
    autoApprove: db.settings?.autoApproveNewUsers !== false,
  });
});

// Update auto-approve setting
app.post('/api/admin/settings/auto-approve', (req, res) => {
  const { enabled } = req.body;
  if (!db.settings) {
    db.settings = { autoApproveNewUsers: true };
  }
  db.settings.autoApproveNewUsers = Boolean(enabled);
  saveDB();
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
  const now = new Date().toISOString();
  for (const user of pendingUsers) {
    user.status = 'approved';
    user.reviewedAt = now;
    updateUserInFirestore(user.id, { status: 'approved', reviewedAt: now }).catch((err) => {
      console.error('Firestore bulk update error:', err);
    });
  }
  saveDB();
  const safeUsers = db.users.map(({ password, recoveryCode, ...rest }) => rest);
  res.json({
    success: true,
    count: pendingUsers.length,
    message: `تم قبول واعتماد جميع الطلبات المعلقة (${pendingUsers.length}) بنجاح وتصريحهم للشات!`,
    users: safeUsers,
  });
});

// Get all users
app.get('/api/admin/users', (req, res) => {
  const safeUsers = db.users.map(({ password, recoveryCode, ...rest }) => rest);
  res.json({ users: safeUsers });
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

  user.status = status;
  user.reviewedAt = new Date().toISOString();
  saveDB();
  updateUserInFirestore(user.id, { status: user.status, reviewedAt: user.reviewedAt }).catch((err) => {
    console.error(`Firestore update error for ${user.id}:`, err);
  });

  const safeUsers = db.users.map(({ password, recoveryCode, ...rest }) => rest);
  res.json({
    message: `تم تحديث حالة المستخدم "${user.fullName || user.username}" إلى: ${
      status === 'approved'
        ? 'مقبول (مصرّح للشات)'
        : status === 'rejected'
        ? 'مرفوض (ممنوع من الشات)'
        : 'قيد المراجعة'
    }`,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      role: user.role,
      reviewedAt: user.reviewedAt,
    },
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
  let parser: any = null;
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
      parser = new PDFParse({ data: buffer });
      const info = await parser.getText();
      estimatedPages = info?.total || info?.pages?.length || 1;
    } catch {
      // Non-blocking if buffer parsing fails on scanned/corrupted PDFs
    } finally {
      if (parser && typeof parser.destroy === 'function') {
        try {
          await parser.destroy();
        } catch {
          // ignore
        }
        parser = null;
      }
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

    // 2. Fallback to basic text parser if all Gemini models failed or had quota limits
    if (!extractedData || !extractedData.content) {
      console.warn('[AI-PDF] Gemini models unavailable or quota exceeded, attempting local parser fallback...');
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        parser = new PDFParse({ data: buffer });
        const parsedText = await parser.getText();
        const rawText = parsedText?.text || '';
        estimatedPages = parsedText?.total || parsedText?.pages?.length || estimatedPages;

        if (rawText.trim()) {
          extractedData = {
            title: cleanTitle,
            category: 'جمارك',
            content: rawText.trim(),
            summary: 'تم استخراج النصوص بواسطة القارئ النصي البديل.',
          };
        }
      } catch (fallbackErr) {
        console.error('[AI-PDF] Fallback parser error:', fallbackErr);
      } finally {
        if (parser && typeof parser.destroy === 'function') {
          try {
            await parser.destroy();
          } catch {
            // ignore
          }
        }
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

  // Verify that the user is approved
  if (username) {
    const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (user && user.status !== 'approved') {
      return res.status(403).json({
        error: 'عذراً، استخدام البوت متاح فقط للمستخدمين المقبولين من قِبل الإدارة.',
      });
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
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Server listening on port ${PORT} (immediate readiness)`);
    // Non-blocking background sync with Firestore Cloud Database
    syncWithFirestore().catch((err) => {
      console.error('Background Firestore sync error:', err);
    });
  });
}

startServer();
