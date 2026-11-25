import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageCropper, computeCropRect, MAX_CROP_SIDE } from '../components/ui/ImageCropper';

const fakeFile = () => new File(['conteudo-falso'], 'cartaz.jpg', { type: 'image/jpeg' });

// ------------------------------------------------------------------ matemática
// O jsdom não desenha canvas, por isso é aqui que o recorte é realmente
// verificado: a função é pura e devolve a região da imagem-fonte.
describe('computeCropRect', () => {
  it('centra uma faixa 16:10 num cartaz vertical 9:16', () => {
    const r = computeCropRect({ imgW: 900, imgH: 1600, zoom: 1, offsetX: 0, offsetY: 0, aspect: 1.6 });
    expect(r.sWidth).toBe(900);
    expect(r.sHeight).toBeCloseTo(562.5, 6);
    expect(r.sx).toBe(0);
    expect(r.sy).toBeCloseTo(518.75, 6); // (1600 - 562.5) / 2
  });

  it('respeita a proporção pedida', () => {
    for (const aspect of [16 / 10, 16 / 9, 4 / 3, 1, 9 / 16]) {
      const r = computeCropRect({ imgW: 1600, imgH: 1200, zoom: 1.4, offsetX: 0.3, offsetY: -0.2, aspect });
      expect(r.sWidth / r.sHeight).toBeCloseTo(aspect, 6);
    }
  });

  it('nunca sai fora da imagem, mesmo com deslocamentos extremos', () => {
    for (const offsetX of [-5, -1, 0, 1, 5]) {
      for (const offsetY of [-5, -1, 0, 1, 5]) {
        const r = computeCropRect({ imgW: 900, imgH: 1600, zoom: 2.5, offsetX, offsetY, aspect: 1.6 });
        expect(r.sx).toBeGreaterThanOrEqual(0);
        expect(r.sy).toBeGreaterThanOrEqual(0);
        expect(r.sx + r.sWidth).toBeLessThanOrEqual(900 + 1e-9);
        expect(r.sy + r.sHeight).toBeLessThanOrEqual(1600 + 1e-9);
      }
    }
  });

  it('encosta ao topo com offsetY -1 e ao fundo com offsetY 1', () => {
    const base = { imgW: 900, imgH: 1600, zoom: 1, offsetX: 0, aspect: 1.6 };
    const top = computeCropRect({ ...base, offsetY: -1 });
    const bottom = computeCropRect({ ...base, offsetY: 1 });
    expect(top.sy).toBe(0);
    expect(bottom.sy).toBeCloseTo(1600 - bottom.sHeight, 6);
  });

  it('o zoom reduz a região recortada de forma proporcional', () => {
    const a = computeCropRect({ imgW: 900, imgH: 1600, zoom: 1, offsetX: 0, offsetY: 0, aspect: 1.6 });
    const b = computeCropRect({ imgW: 900, imgH: 1600, zoom: 2, offsetX: 0, offsetY: 0, aspect: 1.6 });
    expect(b.sWidth).toBeCloseTo(a.sWidth / 2, 6);
    expect(b.sHeight).toBeCloseTo(a.sHeight / 2, 6);
  });

  it('limita o zoom ao intervalo 1x-3x', () => {
    const tooFar = computeCropRect({ imgW: 900, imgH: 1600, zoom: 10, offsetX: 0, offsetY: 0, aspect: 1.6 });
    const atMax = computeCropRect({ imgW: 900, imgH: 1600, zoom: 3, offsetX: 0, offsetY: 0, aspect: 1.6 });
    expect(tooFar.sWidth).toBeCloseTo(atMax.sWidth, 6);

    const tooNear = computeCropRect({ imgW: 900, imgH: 1600, zoom: 0.2, offsetX: 0, offsetY: 0, aspect: 1.6 });
    const atMin = computeCropRect({ imgW: 900, imgH: 1600, zoom: 1, offsetX: 0, offsetY: 0, aspect: 1.6 });
    expect(tooNear.sWidth).toBeCloseTo(atMin.sWidth, 6);
  });

  it('com a proporção original usa a imagem inteira', () => {
    const r = computeCropRect({ imgW: 1200, imgH: 800, zoom: 1, offsetX: 0, offsetY: 0, aspect: 1200 / 800 });
    expect(r.sx).toBe(0);
    expect(r.sy).toBe(0);
    expect(r.sWidth).toBeCloseTo(1200, 6);
    expect(r.sHeight).toBeCloseTo(800, 6);
  });

  it('limita o lado maior da saída a 2000px', () => {
    const r = computeCropRect({ imgW: 5000, imgH: 5000, zoom: 1, offsetX: 0, offsetY: 0, aspect: 1 });
    expect(Math.max(r.outWidth, r.outHeight)).toBe(MAX_CROP_SIDE);
    expect(r.outWidth).toBe(2000);
    expect(r.outHeight).toBe(2000);
  });

  it('não amplia imagens pequenas na saída', () => {
    const r = computeCropRect({ imgW: 640, imgH: 400, zoom: 1, offsetX: 0, offsetY: 0, aspect: 1.6 });
    expect(r.outWidth).toBe(640);
    expect(r.outHeight).toBe(400);
  });

  it('devolve zeros para dimensões inválidas', () => {
    expect(computeCropRect({ imgW: 0, imgH: 0, zoom: 1, offsetX: 0, offsetY: 0, aspect: 1.6 }))
      .toEqual({ sx: 0, sy: 0, sWidth: 0, sHeight: 0, outWidth: 0, outHeight: 0 });
    expect(computeCropRect({ imgW: NaN, imgH: 100, zoom: 1, offsetX: 0, offsetY: 0, aspect: 1.6 }).sWidth)
      .toBe(0);
  });
});

// ------------------------------------------------------------------ componente
const aspectButton = (label: string) => screen.getByRole('button', { name: `Proporção ${label}` });

describe('ImageCropper', () => {
  it('monta com um File falso e mostra os controlos', () => {
    render(<ImageCropper file={fakeFile()} onCancel={() => {}} onCropped={() => {}} />);
    expect(screen.getByRole('group', { name: /Área de recorte/ })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Zoom da imagem' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aplicar recorte' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar recorte' })).toBeInTheDocument();
  });

  it('oferece todas as proporções, com 16:10 pré-selecionada', () => {
    render(<ImageCropper file={fakeFile()} onCancel={() => {}} onCropped={() => {}} />);
    for (const label of ['16:10', '16:9', '4:3', '1:1', '9:16', 'Original']) {
      expect(aspectButton(label)).toBeInTheDocument();
    }
    expect(aspectButton('16:10')).toHaveAttribute('aria-pressed', 'true');
    expect(aspectButton('9:16')).toHaveAttribute('aria-pressed', 'false');
  });

  it('muda a proporção selecionada ao clicar', async () => {
    const user = userEvent.setup();
    render(<ImageCropper file={fakeFile()} onCancel={() => {}} onCropped={() => {}} />);

    await user.click(aspectButton('9:16'));
    expect(aspectButton('9:16')).toHaveAttribute('aria-pressed', 'true');
    expect(aspectButton('16:10')).toHaveAttribute('aria-pressed', 'false');

    await user.click(aspectButton('Original'));
    expect(aspectButton('Original')).toHaveAttribute('aria-pressed', 'true');
    expect(aspectButton('9:16')).toHaveAttribute('aria-pressed', 'false');
  });

  it('aceita a proporção inicial indicada', () => {
    render(<ImageCropper file={fakeFile()} initialAspect={1} onCancel={() => {}} onCropped={() => {}} />);
    expect(aspectButton('1:1')).toHaveAttribute('aria-pressed', 'true');
  });

  it('chama onCancel no botão Cancelar', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ImageCropper file={fakeFile()} onCancel={onCancel} onCropped={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar recorte' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('a área de recorte é operável pelo teclado', () => {
    render(<ImageCropper file={fakeFile()} onCancel={() => {}} onCropped={() => {}} />);

    const stage = screen.getByRole('group', { name: /Área de recorte/ });
    expect(stage).toHaveAttribute('tabindex', '0');

    stage.focus();
    expect(stage).toHaveFocus();

    // Setas e +/- são tratados no elemento; sem imagem carregada não rebentam.
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-']) {
      fireEvent.keyDown(stage, { key });
    }
    expect(stage).toHaveFocus();
  });

  it('o slider de zoom cobre 1x a 3x', () => {
    render(<ImageCropper file={fakeFile()} onCancel={() => {}} onCropped={() => {}} />);
    const slider = screen.getByRole('slider', { name: 'Zoom da imagem' });
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '3');
    expect((slider as HTMLInputElement).value).toBe('1');
  });
});
