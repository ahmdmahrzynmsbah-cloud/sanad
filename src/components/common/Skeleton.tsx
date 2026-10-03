import React from 'react';

/**
 * Basic Shimmer / Pulse Box
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg ${className}`}
    />
  );
};

/**
 * Skeleton Loader for Law Cards (Knowledge Base & Public Catalog)
 */
export const SkeletonLawCard: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-md" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-5/6 rounded-md" />
      </div>
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3.5 w-20 rounded-md" />
        </div>
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
};

/**
 * Skeleton Loader for Law Table Rows (Admin Portal & Knowledge Base list view)
 */
export const SkeletonLawRow: React.FC = () => {
  return (
    <tr className="animate-pulse border-b border-slate-100">
      <td className="p-4">
        <Skeleton className="h-4 w-4 rounded" />
      </td>
      <td className="p-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-56 rounded-md" />
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>
      </td>
      <td className="p-4">
        <Skeleton className="h-5 w-20 rounded-full" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-24 rounded-md" />
      </td>
      <td className="p-4">
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </td>
    </tr>
  );
};

/**
 * Skeleton Loader for Professional Directory Cards (دليل المحاسبين والمدققين)
 */
export const SkeletonProfessionalCard: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 animate-pulse">
      <div className="flex items-start gap-3.5">
        <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
      </div>
      <div className="space-y-1.5 pt-2">
        <Skeleton className="h-3.5 w-full rounded-md" />
        <Skeleton className="h-3.5 w-4/5 rounded-md" />
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <Skeleton className="h-5 w-16 rounded-lg" />
        <Skeleton className="h-5 w-20 rounded-lg" />
        <Skeleton className="h-5 w-14 rounded-lg" />
      </div>
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 w-10 rounded-xl" />
      </div>
    </div>
  );
};

/**
 * Skeleton Loader for Supervisors Cards (هيئة المشرفين)
 */
export const SkeletonSupervisorCard: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-full" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3.5 w-full rounded-md" />
        <Skeleton className="h-3.5 w-5/6 rounded-md" />
        <Skeleton className="h-3.5 w-2/3 rounded-md" />
      </div>
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
};

/**
 * Skeleton Loader for User Table Rows (طلبات المستخدمين)
 */
export const SkeletonUserRow: React.FC = () => {
  return (
    <tr className="animate-pulse border-b border-slate-100">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-40 rounded-md" />
          </div>
        </div>
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-28 rounded-md" />
      </td>
      <td className="p-4">
        <Skeleton className="h-5 w-20 rounded-full" />
      </td>
      <td className="p-4">
        <Skeleton className="h-5 w-24 rounded-full" />
      </td>
      <td className="p-4">
        <Skeleton className="h-5 w-28 rounded-md" />
      </td>
      <td className="p-4">
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-8 w-16 rounded-xl" />
          <Skeleton className="h-8 w-16 rounded-xl" />
        </div>
      </td>
    </tr>
  );
};

/**
 * Skeleton Loader for Law Request Cards in Admin Review
 */
export const SkeletonLawRequestCard: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 animate-pulse">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <Skeleton className="h-4 w-32 rounded-md" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-2/3 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-4/5 rounded-md" />
      </div>
      <div className="pt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Loader for Professional Table Rows in Admin Tab
 */
export const SkeletonProfessionalRow: React.FC = () => {
  return (
    <tr className="animate-pulse border-b border-slate-100">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <Skeleton className="h-5 w-20 rounded-md" />
      </td>
      <td className="px-4 py-3.5">
        <Skeleton className="h-4 w-28 rounded-md" />
      </td>
      <td className="px-4 py-3.5">
        <Skeleton className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-4 py-3.5">
        <Skeleton className="h-5 w-16 rounded-full" />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-center gap-1.5">
          <Skeleton className="h-7 w-12 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      </td>
    </tr>
  );
};

/**
 * Skeleton Loader for Supervisor Table Rows in Admin Tab
 */
export const SkeletonSupervisorRow: React.FC = () => {
  return (
    <tr className="animate-pulse border-b border-slate-100">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-40 rounded-md" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <Skeleton className="h-5 w-32 rounded-md" />
      </td>
      <td className="px-4 py-3.5">
        <Skeleton className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-center gap-2">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      </td>
    </tr>
  );
};
