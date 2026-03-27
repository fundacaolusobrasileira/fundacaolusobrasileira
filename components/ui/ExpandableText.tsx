// components/ui/ExpandableText.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

interface ExpandableTextProps {
  summary: string;
  full?: string;
  detailHref?: string;
  detailLabel?: string;
  previewLines?: number;
  className?: string;
  textClassName?: string;
}

export const ExpandableText: React.FC<ExpandableTextProps> = ({
  summary,
  full,
  detailHref,
  detailLabel = 'Ver página completa',
  previewLines = 4,
  className = '',
  textClassName = 'text-base text-slate-600 font-light leading-relaxed',
}) => {
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState(0);
  const fullRef = useRef<HTMLDivElement>(null);
  const instanceId = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    if (fullRef.current) setHeight(fullRef.current.scrollHeight);
  }, [full, expanded]);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail !== instanceId.current) {
        setExpanded(false);
      }
    };
    window.addEventListener('accordion-open', handler);
    return () => window.removeEventListener('accordion-open', handler);
  }, []);

  const hasFull = !!full && full.trim() !== summary.trim();

  return (
    <div className={className}>
      {/* Preview */}
      <div className="relative">
        <p className={`${textClassName} ${!expanded ? `line-clamp-${previewLines}` : 'hidden'}`}>
          {summary}
        </p>
        {!expanded && hasFull && (
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Full content */}
      {hasFull && (
        <div
          ref={fullRef}
          style={{ maxHeight: expanded ? `${height}px` : 0, overflow: 'hidden' }}
          className="transition-all duration-500 ease-in-out"
        >
          <div className="pt-2">
            {full!.split('\n\n').filter(Boolean).map((para, i) => (
              <p key={i} className={`${textClassName} mb-4 last:mb-0`}>{para}</p>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      {(hasFull || detailHref) && (
        <div className="flex flex-wrap items-center gap-4 mt-3">
          {hasFull && (
            <button
              onClick={() => {
                if (!expanded) window.dispatchEvent(new CustomEvent('accordion-open', { detail: instanceId.current }));
                setExpanded(v => !v);
              }}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-900 hover:text-sand-600 transition-colors uppercase tracking-widest"
              aria-expanded={expanded}
            >
              {expanded ? <><ChevronUp size={13} /> Ver menos</> : <><ChevronDown size={13} /> Ler mais</>}
            </button>
          )}
          {detailHref && (
            <Link
              to={detailHref}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-sand-500 hover:text-brand-900 transition-colors uppercase tracking-widest"
            >
              {detailLabel} <ArrowRight size={11} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
