// components/ui/Forms.tsx
import React from 'react';

export const Input = ({ variant = 'light', className = '', ...props }: any) => {
  const styles = {
    light: "bg-white border-slate-300 text-slate-900 focus:border-sand-400 focus:ring-2 focus:ring-sand-400/20 placeholder:text-slate-500",
    dark: "bg-white/5 border-white/20 text-white focus:border-sand-400 focus:ring-2 focus:ring-sand-400/20 placeholder:text-white/50"
  };
  return <input className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm ${styles[variant as keyof typeof styles] || styles.light} ${className}`} {...props} />;
};
