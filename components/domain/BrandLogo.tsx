// components/domain/BrandLogo.tsx
import React from 'react';

export const BrandLogo = ({
  className = ''
}: {
  variant?: 'original' | 'dark-ui'; // kept for API compatibility
  className?: string
}) => {
  return (
    <div className={`flex items-center select-none ${className}`} role="img" aria-label="Logo Fundação Luso-Brasileira">
      <img
        src="/logo-flb-full.webp"
        alt=""
        width={320}
        height={80}
        className="h-10 md:h-11 w-auto object-contain"
        aria-hidden="true"
      />
    </div>
  );
};
