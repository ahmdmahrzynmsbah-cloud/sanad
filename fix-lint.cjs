const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(
  "import {\n  fetchVideosFromFirestore,",
  "import {"
);
serverCode = serverCode.replace(
  "import {",
  "import { fetchVideosFromFirestore } from './server/firestore';\nimport {"
);

if (!serverCode.includes('conversations?: any[];')) {
  serverCode = serverCode.replace(
    'videos?: any[];',
    'videos?: any[];\n  conversations?: any[];\n  relatedSiteCategories?: any[];'
  );
}

fs.writeFileSync('server.ts', serverCode, 'utf8');

let adminCode = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');
adminCode = adminCode.replace(
  "import { Law, LegalCategory, User, LawRequest, Video } from '../types';",
  "import { Law, LegalCategory, User, LawRequest } from '../types';\nimport { Video } from '../types';"
);
if (!fs.readFileSync('src/types.ts', 'utf8').includes('export interface Video')) {
  fs.appendFileSync('src/types.ts', '\nexport interface Video { id: string; title: string; url: string; description?: string; thumbnailUrl?: string; order?: number; isActive?: boolean; createdAt?: string; }\n');
}

console.log('Fixed lint errors');
