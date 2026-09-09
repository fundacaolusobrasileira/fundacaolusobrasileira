import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DOCUMENTS } from '../store/app.store';
import { buildGroup, downloadDocument } from '../pages/documentacao/DocumentacaoPage';

describe('DocumentacaoPage helpers', () => {
  beforeEach(() => {
    DOCUMENTS.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    DOCUMENTS.length = 0;
  });

  it('removes the legacy Estatutos entry before label formatting', () => {
    DOCUMENTS.push({
      id: '1',
      category: 'estatutos',
      title: 'Estatutos em vigor',
      description: null,
      year: 2026,
      file_url: '/Estatutos.pdf',
      gated: true,
      order: 0,
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
    });

    const group = buildGroup({
      title: 'Estatutos',
      description: 'x',
      category: 'estatutos',
    });

    expect(group.docs).toHaveLength(0);
  });

  it('downloads via blob/object URL and sets a safe filename', async () => {
    vi.useFakeTimers();
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob });
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:unit-test');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const actualCreateElement = document.createElement.bind(document);
    const anchors: HTMLAnchorElement[] = [];
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const el = actualCreateElement(tagName);
      if (tagName === 'a') anchors.push(el as HTMLAnchorElement);
      return el as any;
    }) as any);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('fetch', fetchMock as any);

    await downloadDocument('https://files.example.com/docs/Relatorio%202024.pdf', 'Relatório anual');
    await vi.runAllTimersAsync();

    expect(fetchMock).toHaveBeenCalledWith('https://files.example.com/docs/Relatorio%202024.pdf', { mode: 'cors' });
    expect(createObjectUrl).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
    expect(anchors[0]?.download).toBe('Relatorio 2024.pdf');
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:unit-test');
  });
});
