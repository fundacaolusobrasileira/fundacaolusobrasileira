// services/documents.service.ts
// Documentos institucionais da página /documentacao, geríveis no Dashboard.
import { supabase } from '../supabaseClient';
import { DOCUMENTS, notifyState, showToast, logActivity, isEditor } from '../store/app.store';
import { DocumentSchema } from '../validation/schemas';
import type { InstitutionalDocument, DocumentCategory } from '../types';

const MAX_DOC_SIZE = 30 * 1024 * 1024; // 30MB (relatórios podem ser grandes)

const normalize = (row: any): InstitutionalDocument => ({
  id: row.id,
  category: row.category,
  title: row.title,
  description: row.description ?? null,
  year: row.year ?? null,
  file_url: row.file_url,
  gated: row.gated !== false,
  order: row.order ?? 0,
  active: row.active !== false,
  created_at: row.created_at,
});

export const syncDocuments = async (): Promise<void> => {
  const { data, error } = await supabase
    .from('institutional_documents')
    .select('*')
    .order('category', { ascending: true })
    .order('order', { ascending: true })
    .order('created_at', { ascending: true });
  DOCUMENTS.length = 0;
  // Em caso de erro (tabela não migrada / sem permissão) deixamos vazio:
  // a página mostra o estado "em preparação" sem quebrar.
  if (!error && data) DOCUMENTS.push(...data.map(normalize));
  notifyState();
};

export const getDocumentsByCategory = (category: DocumentCategory): InstitutionalDocument[] =>
  DOCUMENTS
    .filter(d => d.category === category && d.active !== false)
    .sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));

/**
 * Upload de PDF para o Supabase Storage (bucket `media`, pasta documents/).
 * Retorna a URL pública, ou null em caso de erro.
 */
export const uploadDocumentFile = async (file: File): Promise<string | null> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return null; }
  if (file.type !== 'application/pdf') { showToast('Envie um arquivo PDF.', 'error'); return null; }
  if (file.size > MAX_DOC_SIZE) { showToast('Arquivo muito grande (máx. 30MB).', 'error'); return null; }
  const safe = file.name.replace(/[^a-zA-Z0-9.]/g, '');
  const path = `documents/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) { showToast(`Erro no upload: ${error.message}`, 'error'); return null; }
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
};

export const createDocument = async (input: {
  category: DocumentCategory;
  title: string;
  file_url: string;
  description?: string | null;
  year?: number | null;
  gated?: boolean;
  order?: number;
  active?: boolean;
}): Promise<InstitutionalDocument | null> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return null; }

  const fallbackOrder =
    Math.max(0, ...DOCUMENTS.filter(d => d.category === input.category).map(d => d.order)) + 1;

  const candidate = {
    category: input.category,
    title: input.title,
    description: input.description ?? null,
    year: input.year ?? null,
    file_url: input.file_url,
    gated: input.gated ?? true,
    order: input.order ?? fallbackOrder,
    active: input.active ?? true,
  };

  const parsed = DocumentSchema.safeParse(candidate);
  if (!parsed.success) {
    showToast(parsed.error.issues[0]?.message || 'Dados inválidos.', 'error');
    return null;
  }

  const { data, error } = await supabase
    .from('institutional_documents')
    .insert([parsed.data])
    .select()
    .single();
  if (error || !data) { showToast('Erro ao adicionar documento.', 'error'); return null; }

  const created = normalize(data);
  DOCUMENTS.push(created);
  logActivity('Adicionou documento', created.title);
  notifyState();
  showToast('Documento adicionado.', 'success');
  return created;
};

export const updateDocument = async (
  id: string,
  patch: Partial<Pick<InstitutionalDocument, 'category' | 'title' | 'description' | 'year' | 'file_url' | 'gated' | 'order' | 'active'>>,
): Promise<boolean> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return false; }

  const parsed = DocumentSchema.partial().safeParse(patch);
  if (!parsed.success) {
    showToast(parsed.error.issues[0]?.message || 'Dados inválidos.', 'error');
    return false;
  }

  // RLS USING denial devolve { error: null, data: [] } — confirmar linhas afetadas.
  const { data, error } = await supabase
    .from('institutional_documents')
    .update(parsed.data)
    .eq('id', id)
    .select('id');
  if (error) { showToast('Erro ao atualizar documento.', 'error'); return false; }
  if (!data || data.length === 0) { showToast('Sem permissão para atualizar.', 'error'); return false; }

  const idx = DOCUMENTS.findIndex(d => d.id === id);
  if (idx !== -1) DOCUMENTS[idx] = { ...DOCUMENTS[idx], ...parsed.data } as InstitutionalDocument;
  logActivity('Editou documento', DOCUMENTS.find(d => d.id === id)?.title || id);
  notifyState();
  showToast('Documento atualizado.', 'success');
  return true;
};

export const deleteDocument = async (id: string): Promise<boolean> => {
  if (!isEditor()) { showToast('Sem permissão.', 'error'); return false; }

  const { data, error } = await supabase
    .from('institutional_documents')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) { showToast('Erro ao remover documento.', 'error'); return false; }
  if (!data || data.length === 0) { showToast('Sem permissão para remover.', 'error'); return false; }

  const idx = DOCUMENTS.findIndex(d => d.id === id);
  if (idx !== -1) {
    const title = DOCUMENTS[idx].title;
    DOCUMENTS.splice(idx, 1);
    logActivity('Removeu documento', title);
    notifyState();
    showToast('Documento removido.', 'success');
  }
  return true;
};
