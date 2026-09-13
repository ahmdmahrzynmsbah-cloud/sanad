const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const targetProps = `interface AdminPortalProps {
  onLawsUpdated?: () => void;
  onBrandingUpdated?: (branding: SystemBranding) => void;
  onAboutUpdated?: (about: PlatformAboutData) => void;
  onContactUpdated?: (contact: ContactInfo) => void;
}`;

const replacementProps = `interface AdminPortalProps {
  currentAdmin?: { username: string; role: string; fullName?: string };
  onLawsUpdated?: () => void;
  onBrandingUpdated?: (branding: SystemBranding) => void;
  onAboutUpdated?: (about: PlatformAboutData) => void;
  onContactUpdated?: (contact: ContactInfo) => void;
}`;

code = code.replace(targetProps, replacementProps);

const targetComponent = `export const AdminPortal: React.FC<AdminPortalProps> = ({ onLawsUpdated, onBrandingUpdated, onAboutUpdated, onContactUpdated }) => {`;
const replacementComponent = `export const AdminPortal: React.FC<AdminPortalProps> = ({ currentAdmin, onLawsUpdated, onBrandingUpdated, onAboutUpdated, onContactUpdated }) => {
  const isSupervisor = currentAdmin?.role === 'supervisor';
`;

code = code.replace(targetComponent, replacementComponent);

fs.writeFileSync('src/components/AdminPortal.tsx', code);
console.log("Updated AdminPortalProps");
