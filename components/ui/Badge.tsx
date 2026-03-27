// components/ui/Badge.tsx
import React from 'react';

export const Badge = ({ children, className = '', variant = 'light' }: any) => {
  const styles = {
    light: "bg-slate-100 text-slate-700 border-slate-200/50",
    dark: "bg-white/10 text-white/90 border-white/10 backdrop-blur-md",
    gold: "bg-sand-400/10 text-sand-700 border-sand-400/20"
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border ${styles[variant as keyof typeof styles] || styles.light} ${className}`}>
      {children}
    </span>
  );
};
