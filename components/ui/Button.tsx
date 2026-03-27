// components/ui/Button.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({ children, variant = 'primary', className = '', isLoading = false, disabled, ...props }: any) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-900/50 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide text-xs uppercase relative overflow-hidden active:scale-95";
  const variants: { [key: string]: string } = {
    primary: "bg-brand-900 text-white hover:bg-black border border-brand-800 hover:border-black shadow-lg hover:shadow-xl hover:-translate-y-0.5",
    gold: "bg-sand-400 text-brand-900 font-bold hover:bg-sand-300 shadow-[0_0_20px_rgba(176,146,101,0.2)] hover:shadow-[0_0_30px_rgba(176,146,101,0.4)] border border-sand-300",
    outline: "border border-slate-200 text-slate-700 bg-white/40 backdrop-blur-md hover:bg-white hover:text-black hover:border-slate-400",
    white: "bg-white text-brand-900 hover:bg-sand-50 shadow-premium hover:shadow-lg hover:-translate-y-0.5 border border-white",
    darkOutline: "border border-brand-900 text-brand-900 bg-transparent hover:bg-brand-900 hover:text-white",
    ghost: "text-slate-600 hover:text-brand-900 hover:bg-slate-100/50 px-4",
    danger: "text-red-600 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-100"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant as string] || variants.primary} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          <span>{children}</span>
        </div>
      ) : children}
    </button>
  );
};
