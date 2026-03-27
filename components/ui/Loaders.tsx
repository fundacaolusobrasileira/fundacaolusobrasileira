// components/ui/Loaders.tsx
import React, { useState, useEffect } from 'react';
import { resolveGalleryItemSrc } from '../../store/app.store';
import type { GalleryItem, SocialLinks } from '../../types';

// --- PREMIUM LOADER ---
export const PremiumLoader = ({ fullScreen = true, className = '' }) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        bg-brand-900 text-white
        transition-opacity duration-300 ease-out
        ${fullScreen ? 'fixed inset-0 z-[9999] bg-brand-900/95 backdrop-blur-md' : 'w-full h-64 bg-transparent'}
        ${className}
      `}
      role="status"
      aria-live="polite"
      aria-label="Carregando"
    >
      {fullScreen && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
      )}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-24 h-24 mb-8">
          <svg className="absolute inset-0 w-full h-full animate-[spin_8s_linear_infinite] motion-reduce:animate-none" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="#C9AF88" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="none" stroke="url(#gold-gradient)" strokeWidth="1" strokeDasharray="80 200" strokeLinecap="round" />
          </svg>
        </div>
        {fullScreen && (
          <div className="text-center space-y-2 animate-fadeInUpSlow">
            <h2 className="font-serif text-lg tracking-[0.1em] text-white/90">Fundação Luso-Brasileira</h2>
            <span className="sr-only">Carregando conteúdo...</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Async Image ---
export const AsyncImage = ({ item, className = '' }: { item: GalleryItem, className?: string }) => {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    let active = true;
    const resolved = resolveGalleryItemSrc(item);
    // resolveGalleryItemSrc may return a string directly or a promise
    if (typeof resolved === 'string') {
      setSrc(resolved);
    } else if (resolved && typeof (resolved as any).then === 'function') {
      (resolved as any).then((url: string) => { if (active && url) setSrc(url); });
    }
    return () => { active = false; };
  }, [item]);

  if (!src) return <div className={`bg-slate-100 animate-pulse ${className}`} role="img" aria-label="Imagem carregando" />;
  return <img src={src} className={className} alt={item.caption || "Imagem da galeria"} />;
};

// --- Social Icons Helper ---
const SocialSVG = ({ type, className = "w-4 h-4" }: { type: keyof SocialLinks, className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    facebook: <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.971.956-2.971 3.594v.376h3.428l-.532 3.667h-2.896v7.981h-4.843Z"></path></svg>,
    twitter: <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.254 5.49c-.44.086-1.29.17-1.461.182.261-.392 1.25-1.921 1.34-2.126.027-.061.026-.145-.043-.197a.172.172 0 0 0-.173-.021c-.052.018-1.595.61-2.057.77a4.91 4.91 0 0 0-3.692-1.68c-2.956 0-5.111 2.593-4.717 5.726-3.826-.195-7.078-2.073-9.213-4.802a.267.267 0 0 0-.441.056c-1.328 2.892-.32 6.136 2.05 7.632a4.872 4.872 0 0 1-2.032-.596v.058c0 2.217 1.458 4.162 3.57 4.622-.592.162-1.32.189-1.93.07a4.977 4.977 0 0 0 4.594 3.42 9.548 9.548 0 0 1-5.783 2.022c-.37 0-.829-.026-1.127-.065a13.593 13.593 0 0 0 7.72 2.37c9.356 0 14.628-7.98 14.334-15.013.916-.685 1.83-1.636 2.083-1.986.069-.096.02-.236-.085-.262Z"></path></svg>,
    instagram: <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
    linkedin: <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.47 2H3.53a1.45 1.45 0 0 0-1.47 1.43v17.14A1.45 1.45 0 0 0 3.53 22h16.94a1.45 1.45 0 0 0 1.47-1.43V3.43A1.45 1.45 0 0 0 20.47 2ZM8.09 18.74h-3v-9h3v9ZM6.59 8.48h-.02a1.57 1.57 0 1 1 .02 0Zm12.32 10.26h-3v-4.83c0-1.21-.43-2-1.52-2-.83 0-1.32.55-1.54 1.07-.08.19-.1.45-.1.71v5.05h-3v-9h3v1.37a3.24 3.24 0 0 1 2.94-1.61c2.15 0 3.76 1.38 3.76 4.36v4.88Z"></path></svg>,
    youtube: <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z"></path></svg>
  };
  return icons[type] ? <span className="inline-block">{icons[type]}</span> : null;
};

export const SocialIcons = ({ links, variant = 'dark', size = 'md' }: { links: Partial<SocialLinks>, variant?: 'light' | 'dark' | 'white', size?: 'sm' | 'md' }) => {
  if (!links) return null;
  const baseClass = "flex items-center justify-center rounded-full transition-all duration-300 border focus:ring-2 focus:ring-offset-2 focus:ring-sand-400 focus:outline-none";
  const sizeClass = size === 'sm' ? "w-8 h-8 p-2" : "w-10 h-10 p-2.5";
  const variants = {
    dark: "bg-brand-900 text-white border-transparent hover:bg-sand-400 hover:text-brand-900",
    light: "bg-white/10 text-white border-white/10 hover:bg-white hover:text-brand-900",
    white: "bg-white text-brand-900 border-white hover:bg-brand-900 hover:text-white shadow-sm"
  };
  const validLinks = Object.entries(links).filter(([_, url]) => !!url);
  if (validLinks.length === 0) return null;
  return (
    <div className="flex gap-3">
      {validLinks.map(([key, url]) => (
        <a
          key={key}
          href={url as string}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseClass} ${sizeClass} ${variants[variant]}`}
          aria-label={`Visitar nosso ${key}`}
        >
          <SocialSVG type={key as keyof SocialLinks} className="w-full h-full" />
        </a>
      ))}
    </div>
  );
};
