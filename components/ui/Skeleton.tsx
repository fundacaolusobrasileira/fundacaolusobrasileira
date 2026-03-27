// components/ui/Skeleton.tsx
import React from 'react';
import { PremiumLoader } from './Loaders';

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} role="status" aria-label="Carregando..."></div>
);

export const AsyncContent = ({ loading, fallback, children }: any) => {
  if (loading) return fallback ? <>{fallback}</> : <div className="py-20 flex justify-center"><PremiumLoader fullScreen={false} /></div>;
  return <>{children}</>;
};
