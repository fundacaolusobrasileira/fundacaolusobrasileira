// pages/dashboard/EventQrSection.tsx
// QR code para divulgar a rota pública de envio de mídia de um evento
// (/eventos/:id/colaborar). Gera PNG (canvas, para ecrã e download) e SVG
// (string, para impressão grande e apresentações).
//
// Sem logótipo sobreposto de propósito: tapar módulos do QR reduz a taxa de
// leitura em telemóveis, que é exactamente o único cliente deste código.
import React, { useEffect, useRef, useState } from 'react';
import * as QRCode from 'qrcode';
import { QrCode, Download, Copy, Check, Loader2, AlertTriangle } from 'lucide-react';
import { EVENTS, FLB_STATE_EVENT } from '../../store/app.store';

// Domínio público do site. HashRouter → a rota vive depois do `#`.
const PUBLIC_SITE_ORIGIN = 'https://www.fundacaolusobrasileira.pt';

const QR_DARK = '#0A1410'; // cor da marca (brand-900)
const QR_LIGHT = '#FFFFFF';
const QR_MARGIN = 2;
const QR_ERROR_CORRECTION = 'M' as const;
const QR_CANVAS_WIDTH = 512;

const colaborarLink = (eventId: string) =>
  `${PUBLIC_SITE_ORIGIN}/#/eventos/${eventId}/colaborar`;

const slugify = (value: string) =>
  (value || 'evento')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'evento';

export const EventQrSection = () => {
  const [, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [svgMarkup, setSvgMarkup] = useState('');
  const [generating, setGenerating] = useState(false);
  const [qrError, setQrError] = useState('');
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Todos os temporizadores criados aqui são registados para serem limpos no
  // unmount — nada fica pendurado se a secção desaparecer do dashboard.
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const track = (timer: ReturnType<typeof setTimeout>) => {
    timersRef.current.push(timer);
  };

  useEffect(() => {
    const handler = () => setTick(v => v + 1);
    window.addEventListener(FLB_STATE_EVENT, handler);
    return () => window.removeEventListener(FLB_STATE_EVENT, handler);
  }, []);

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  // EVENTS é um array mutável do store: calculamos a cada renderização (há um
  // `tick` ligado ao FLB_STATE_EVENT) em vez de memoizar por referência, que
  // nunca muda e deixaria a lista desatualizada.
  const events = EVENTS;
  const selectedEvent = events.find(e => e.id === selectedId);

  // Os eventos chegam do Supabase depois da primeira renderização: assim que a
  // lista existir, pré-selecionamos o primeiro para não ficar o painel vazio.
  useEffect(() => {
    if (!selectedId && events.length > 0) setSelectedId(events[0].id);
  }, [events.length, selectedId]);

  const link = selectedId ? colaborarLink(selectedId) : '';

  // Geração do QR com cancelamento: se o utilizador trocar de evento depressa,
  // o resultado da geração anterior é descartado e não escreve no estado.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!link || !canvas) {
      setSvgMarkup('');
      setQrError('');
      return;
    }

    let cancelled = false;
    setGenerating(true);
    setQrError('');

    const options = {
      errorCorrectionLevel: QR_ERROR_CORRECTION,
      margin: QR_MARGIN,
      color: { dark: QR_DARK, light: QR_LIGHT },
    };

    (async () => {
      try {
        await QRCode.toCanvas(canvas, link, { ...options, width: QR_CANVAS_WIDTH });
        if (cancelled) return;
        const markup = await QRCode.toString(link, { ...options, type: 'svg' });
        if (cancelled) return;
        setSvgMarkup(markup);
      } catch (err: any) {
        if (cancelled) return;
        if (import.meta.env.DEV) console.error('[EventQrSection] falha ao gerar QR:', err);
        setSvgMarkup('');
        setQrError('Não foi possível gerar o QR code deste evento.');
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [link]);

  const triggerDownload = (href: string, filename: string, revoke?: boolean) => {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    if (revoke) {
      // Revogar no mesmo tick cancela downloads em alguns browsers.
      track(setTimeout(() => URL.revokeObjectURL(href), 10000));
    }
  };

  const baseFilename = `qr-${slugify(selectedEvent?.title || '')}`;

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas || !link) return;
    try {
      triggerDownload(canvas.toDataURL('image/png'), `${baseFilename}.png`);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[EventQrSection] falha no download PNG:', err);
      setQrError('Não foi possível preparar o PNG.');
    }
  };

  const handleDownloadSvg = () => {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${baseFilename}.svg`, true);
  };

  const handleCopyLink = () => {
    if (!link) return;
    const done = () => {
      setCopied(true);
      track(setTimeout(() => setCopied(false), 2000));
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(done).catch(() => {
        setQrError('O browser não permitiu copiar. Selecione o link e copie à mão.');
      });
    } else {
      setQrError('O browser não permite copiar automaticamente. Selecione o link e copie à mão.');
    }
  };

  return (
    <div className="mt-6 animate-fadeInUpSlow delay-300">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-sm">
          <h3 className="font-medium text-brand-900 flex items-center gap-2">
            <QrCode size={16} /> QR Code de Envio de Mídia
            <span className="ml-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Página pública de colaboração
            </span>
          </h3>
        </div>

        <div className="p-5">
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Escolha um evento para gerar o QR code que leva ao formulário público de envio de
            fotografias e vídeos. Imprima-o ou projete-o no evento: quem o ler no telemóvel pode
            enviar a sua memória sem precisar de conta.
          </p>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 mb-5">
            <label htmlFor="qr-event-select" className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Evento
            </label>
            <select
              id="qr-event-select"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              disabled={events.length === 0}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all disabled:opacity-50"
            >
              {events.length === 0 ? (
                <option value="">Nenhum evento disponível</option>
              ) : (
                events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title}{event.date ? ` — ${event.date}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-5 items-start">
            <div className="mx-auto md:mx-0">
              <div className="relative w-[240px] h-[240px] rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                <canvas
                  ref={canvasRef}
                  aria-label={selectedEvent ? `QR code do evento ${selectedEvent.title}` : 'QR code'}
                  role="img"
                  className={`max-w-full max-h-full ${link && !qrError ? '' : 'opacity-0'}`}
                />
                {(!link || qrError) && (
                  <span className="absolute inset-0 flex items-center justify-center text-center px-4 text-[11px] text-slate-400">
                    {qrError ? 'QR indisponível' : 'Escolha um evento para gerar o QR code.'}
                  </span>
                )}
                {generating && (
                  <span className="absolute inset-0 flex items-center justify-center bg-white/70" role="status" aria-live="polite">
                    <Loader2 size={20} className="animate-spin text-brand-900" />
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={!link || generating || !!qrError}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
                >
                  <Download size={14} /> PNG
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  disabled={!svgMarkup || generating}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
                >
                  <Download size={14} /> SVG
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={!link}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied ? 'Copiado' : 'Copiar link'}
                </button>
              </div>

              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Link</p>
              <p className="text-xs text-slate-700 font-mono break-all select-all bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                {link || '—'}
              </p>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                O PNG serve para ecrã e impressão normal; o SVG não perde qualidade e é o formato
                indicado para cartazes grandes e apresentações. O QR não leva logótipo sobreposto
                para não prejudicar a leitura.
              </p>

              {qrError && (
                <p className="mt-3 flex items-start gap-2 text-xs text-red-500" role="alert">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {qrError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
