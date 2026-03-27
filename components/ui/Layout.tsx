// components/ui/Layout.tsx
import React from 'react';

export const SectionWrapper = ({ children, className = '' }: any) => (
  <section className={`max-w-[1400px] mx-auto px-6 lg:px-12 py-16 ${className}`}>{children}</section>
);

export const Card = ({ children, className = '', variant = 'light', ...props }: any) => {
  const variants = {
    light: "bg-white border border-slate-200/60",
    dark: "bg-brand-900 border border-white/10 text-white"
  };
  return <div className={`${variants[variant as keyof typeof variants] || variants.light} rounded-2xl ${className}`} {...props}>{children}</div>;
};
