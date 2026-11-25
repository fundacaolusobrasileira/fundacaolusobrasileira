// components/ui/ImageCropper.tsx
// Recorte de imagem de capa sem dependências externas: <canvas> + Pointer Events.
//
// Decisões:
// - A MATEMÁTICA está separada da PINTURA. `computeCropRect()` é pura e devolve a
//   região da imagem-fonte a recortar; o componente só a usa para posicionar o
//   <img> (em percentagens, logo sem medir layout) e para o drawImage final.
// - Zoom por slider, nunca pela roda do rato: dentro de um modal com scroll a roda
//   tem de continuar a fazer scroll da página.
// - Pointer Events cobrem rato e toque com um só caminho de código.
// - O objectURL é sempre revogado no cleanup do efeito.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, X, ZoomIn } from 'lucide-react';

// ------------------------------------------------------------------ matemática

export const MAX_CROP_SIDE = 2000;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

export type CropInput = {
  /** Largura natural da imagem-fonte, em pixels. */
  imgW: number;
  /** Altura natural da imagem-fonte, em pixels. */
  imgH: number;
  /** 1 = enquadramento máximo possível; 3 = aproximação máxima. */
  zoom: number;
  /** -1 = encostado à esquerda, 0 = centrado, 1 = encostado à direita. */
  offsetX: number;
  /** -1 = encostado ao topo, 0 = centrado, 1 = encostado ao fundo. */
  offsetY: number;
  /** Proporção desejada (largura / altura). */
  aspect: number;
};

export type CropRect = {
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
  /** Dimensões de saída, com o lado maior limitado a MAX_CROP_SIDE. */
  outWidth: number;
  outHeight: number;
};

const clampNum = (v: number, min: number, max: number): number => {
  if (!Number.isFinite(v)) return min;
  if (v < min) return min;
  if (v > max) return max;
  return v;
};

/**
 * Converte (zoom, deslocamento, proporção) na região da imagem-fonte a recortar.
 * Pura e testável sem canvas — é aqui que vivem os erros de cálculo.
 */
export const computeCropRect = (input: CropInput): CropRect => {
  const imgW = Number.isFinite(input.imgW) ? input.imgW : 0;
  const imgH = Number.isFinite(input.imgH) ? input.imgH : 0;
  if (imgW <= 0 || imgH <= 0) {
    return { sx: 0, sy: 0, sWidth: 0, sHeight: 0, outWidth: 0, outHeight: 0 };
  }

  const aspect =
    Number.isFinite(input.aspect) && input.aspect > 0 ? input.aspect : imgW / imgH;
  const zoom = clampNum(input.zoom, MIN_ZOOM, MAX_ZOOM);

  // Maior rectângulo com a proporção pedida que cabe na imagem (zoom = 1).
  const baseW = Math.min(imgW, imgH * aspect);
  const baseH = baseW / aspect;

  const sWidth = baseW / zoom;
  const sHeight = baseH / zoom;

  const slackX = Math.max(0, imgW - sWidth);
  const slackY = Math.max(0, imgH - sHeight);

  const offsetX = clampNum(input.offsetX, -1, 1);
  const offsetY = clampNum(input.offsetY, -1, 1);

  const sx = clampNum((slackX / 2) * (1 + offsetX), 0, slackX);
  const sy = clampNum((slackY / 2) * (1 + offsetY), 0, slackY);

  const longest = Math.max(sWidth, sHeight);
  const k = longest > MAX_CROP_SIDE ? MAX_CROP_SIDE / longest : 1;

  return {
    sx,
    sy,
    sWidth,
    sHeight,
    outWidth: Math.max(1, Math.round(sWidth * k)),
    outHeight: Math.max(1, Math.round(sHeight * k)),
  };
};

// ------------------------------------------------------------------ proporções

type AspectKey = '16:10' | '16:9' | '4:3' | '1:1' | '9:16' | 'original';

const ASPECTS: ReadonlyArray<{ key: AspectKey; label: string; value: number | null }> = [
  { key: '16:10', label: '16:10', value: 16 / 10 },
  { key: '16:9', label: '16:9', value: 16 / 9 },
  { key: '4:3', label: '4:3', value: 4 / 3 },
  { key: '1:1', label: '1:1', value: 1 },
  { key: '9:16', label: '9:16', value: 9 / 16 },
  { key: 'original', label: 'Original', value: null },
];

const DEFAULT_ASPECT = 16 / 10;
/** Proporção da "mesa" onde a moldura é desenhada; o resto fica escurecido. */
const STAGE_ASPECT = 16 / 10;

const keyForAspect = (aspect: number): AspectKey => {
  const hit = ASPECTS.find(a => a.value !== null && Math.abs(a.value - aspect) < 0.01);
  return hit ? hit.key : '16:10';
};

// ------------------------------------------------------------------ componente

export type ImageCropperProps = {
  file: File;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
  /** Proporção pré-selecionada (por omissão 16:10, a das páginas de artigo). */
  initialAspect?: number;
};

type DragState = { pointerId: number; x: number; y: number; ox: number; oy: number; w: number; h: number };

export const ImageCropper: React.FC<ImageCropperProps> = ({
  file, onCancel, onCropped, initialAspect,
}) => {
  const [aspectKey, setAspectKey] = useState<AspectKey>(() =>
    initialAspect && initialAspect > 0 ? keyForAspect(initialAspect) : '16:10');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const imgElRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Carregamento + libertação do objectURL. O revoke no cleanup não é opcional.
  useEffect(() => {
    const make = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL : null;
    if (!make) return;

    const objectUrl = make(file);
    let alive = true;
    setUrl(objectUrl);
    setSize(null);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);

    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      imgElRef.current = img;
      setSize({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
    };
    img.src = objectUrl;

    return () => {
      alive = false;
      img.onload = null;
      imgElRef.current = null;
      if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const aspect = useMemo(() => {
    const entry = ASPECTS.find(a => a.key === aspectKey);
    if (entry && entry.value !== null) return entry.value;
    if (size && size.w > 0 && size.h > 0) return size.w / size.h;
    return DEFAULT_ASPECT;
  }, [aspectKey, size]);

  const rect = useMemo(
    () => computeCropRect({
      imgW: size?.w ?? 0, imgH: size?.h ?? 0, zoom, offsetX, offsetY, aspect,
    }),
    [size, zoom, offsetX, offsetY, aspect],
  );

  // Geometria em percentagens: não precisa de medir o DOM, logo funciona em jsdom.
  const frameWPct = aspect >= STAGE_ASPECT ? 100 : (aspect / STAGE_ASPECT) * 100;
  const frameHPct = aspect >= STAGE_ASPECT ? (STAGE_ASPECT / aspect) * 100 : 100;
  const frameLeftPct = (100 - frameWPct) / 2;
  const frameTopPct = (100 - frameHPct) / 2;

  const hasImage = !!size && rect.sWidth > 0 && rect.sHeight > 0;
  const imgStyle: React.CSSProperties = hasImage
    ? {
        position: 'absolute',
        width: `${((size!.w / rect.sWidth) * frameWPct).toFixed(4)}%`,
        height: `${((size!.h / rect.sHeight) * frameHPct).toFixed(4)}%`,
        left: `${(frameLeftPct - (rect.sx / rect.sWidth) * frameWPct).toFixed(4)}%`,
        top: `${(frameTopPct - (rect.sy / rect.sHeight) * frameHPct).toFixed(4)}%`,
        maxWidth: 'none',
      }
    : { display: 'none' };

  // --------------------------------------------------------------- interação

  const nudge = useCallback((dx: number, dy: number) => {
    if (dx !== 0) setOffsetX(v => clampNum(v + dx, -1, 1));
    if (dy !== 0) setOffsetY(v => clampNum(v + dy, -1, 1));
  }, []);

  const bumpZoom = useCallback((d: number) => {
    setZoom(v => Math.round(clampNum(v + d, MIN_ZOOM, MAX_ZOOM) * 100) / 100);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasImage) return;
    const box = frameRef.current?.getBoundingClientRect();
    dragRef.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      ox: offsetX,
      oy: offsetY,
      w: box?.width ?? 0,
      h: box?.height ?? 0,
    };
    const target = e.currentTarget;
    if (typeof target.setPointerCapture === 'function') {
      try { target.setPointerCapture(e.pointerId); } catch { /* ignorado */ }
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !size) return;

    const slackX = Math.max(0, size.w - rect.sWidth);
    const slackY = Math.max(0, size.h - rect.sHeight);

    // px no ecrã → px da imagem-fonte → variação de offset (-1..1).
    if (slackX > 0 && drag.w > 0) {
      const dSrc = ((e.clientX - drag.x) * rect.sWidth) / drag.w;
      setOffsetX(clampNum(drag.ox - (2 * dSrc) / slackX, -1, 1));
    }
    if (slackY > 0 && drag.h > 0) {
      const dSrc = ((e.clientY - drag.y) * rect.sHeight) / drag.h;
      setOffsetY(clampNum(drag.oy - (2 * dSrc) / slackY, -1, 1));
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const target = e.currentTarget;
    if (typeof target.releasePointerCapture === 'function') {
      try { target.releasePointerCapture(drag.pointerId); } catch { /* ignorado */ }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.2 : 0.06;
    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); nudge(-step, 0); break;
      case 'ArrowRight': e.preventDefault(); nudge(step, 0); break;
      case 'ArrowUp':    e.preventDefault(); nudge(0, -step); break;
      case 'ArrowDown':  e.preventDefault(); nudge(0, step); break;
      case '+':
      case '=':          e.preventDefault(); bumpZoom(0.1); break;
      case '-':
      case '_':          e.preventDefault(); bumpZoom(-0.1); break;
      default: break;
    }
  };

  const handleApply = () => {
    const img = imgElRef.current;
    if (!img || !size || !hasImage) return;
    const canvas = document.createElement('canvas');
    canvas.width = rect.outWidth;
    canvas.height = rect.outHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof canvas.toBlob !== 'function') return;

    const sx = Math.max(0, Math.floor(rect.sx));
    const sy = Math.max(0, Math.floor(rect.sy));
    const sw = Math.max(1, Math.min(Math.round(rect.sWidth), size.w - sx));
    const sh = Math.max(1, Math.min(Math.round(rect.sHeight), size.h - sy));
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, rect.outWidth, rect.outHeight);

    setBusy(true);
    canvas.toBlob(blob => {
      setBusy(false);
      if (blob) onCropped(blob);
    }, 'image/jpeg', 0.9);
  };

  // ----------------------------------------------------------------- render

  const btn = 'px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-colors';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Proporção do recorte">
        {ASPECTS.map(a => {
          const active = a.key === aspectKey;
          return (
            <button
              key={a.key}
              type="button"
              aria-pressed={active}
              aria-label={`Proporção ${a.label}`}
              onClick={() => { setAspectKey(a.key); setOffsetX(0); setOffsetY(0); }}
              className={`${btn} ${active
                ? 'border-brand-900 bg-brand-900 text-white'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {a.label}
            </button>
          );
        })}
      </div>

      <div
        tabIndex={0}
        role="group"
        aria-label="Área de recorte: use as setas para posicionar a imagem e as teclas mais e menos para o zoom"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className="relative w-full overflow-hidden rounded-lg bg-slate-900 touch-none select-none cursor-move outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2"
        style={{ aspectRatio: '16 / 10' }}
      >
        {url && <img src={url} alt="" draggable={false} style={imgStyle} />}
        <div
          ref={frameRef}
          aria-hidden="true"
          className="absolute pointer-events-none border border-white/80"
          style={{
            left: `${frameLeftPct}%`,
            top: `${frameTopPct}%`,
            width: `${frameWPct}%`,
            height: `${frameHPct}%`,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
          }}
        />
        {!hasImage && (
          <p className="absolute inset-0 flex items-center justify-center text-[11px] uppercase tracking-widest text-white/60">
            A carregar imagem...
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ZoomIn size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          aria-label="Zoom da imagem"
          onChange={e => setZoom(clampNum(Number(e.target.value), MIN_ZOOM, MAX_ZOOM))}
          className="w-full accent-brand-900"
        />
        <span className="shrink-0 w-10 text-right text-[11px] font-bold text-slate-500 tabular-nums">
          {zoom.toFixed(1)}×
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar recorte"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-colors"
        >
          <X size={14} aria-hidden="true" /> Cancelar
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!hasImage || busy}
          aria-label="Aplicar recorte"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-900 text-white hover:bg-brand-800 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          <Check size={14} aria-hidden="true" /> Aplicar recorte
        </button>
      </div>
    </div>
  );
};
