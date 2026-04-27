// validation/schemas.ts
import { z } from 'zod';
import { isSafeHttpUrl } from '../utils/url';

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export const CadastroSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha muito longa'),
  type: z.enum(['individual', 'institucional']),
});

export const ResetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha muito longa'),
  confirm: z.string(),
}).refine(data => data.password === data.confirm, {
  message: 'As senhas não coincidem',
  path: ['confirm'],
});

export const PreCadastroSchema = z.object({
  registrationType: z.enum(['membro', 'parceiro', 'colaborador', 'embaixador'], {
    message: 'Selecione um tipo de registo',
  }),
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido'),
  type: z.string().min(1, 'Selecione um perfil'),
  message: z.string().max(1000, 'Mensagem muito longa (máx. 1000 caracteres)').optional(),
});

export const ColaborarSchema = z.object({
  authorName: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido'),
  url: z.string().min(1, 'Adicione uma imagem ou vídeo'),
  message: z.string().max(500, 'Mensagem muito longa (máx. 500 caracteres)').optional(),
  agreedToTerms: z.literal(true, {
    message: 'Você precisa concordar com os termos para continuar',
  }),
});

export const BenefitSchema = z.object({
  partner_id: z.string().uuid('partner_id must be a valid UUID'),
  title: z.string().min(1, 'Título obrigatório').max(200, 'Título muito longo'),
  description: z.string().max(1000).optional(),
  category: z.enum(['desconto', 'acesso', 'serviço', 'outro']),
  link: z.string().optional().refine(
    v => v === undefined || v === '' || isSafeHttpUrl(v),
    { message: 'Link deve ser uma URL HTTP/HTTPS válida' }
  ),
  active: z.boolean(),
  order: z.number().int().min(0, 'Ordem não pode ser negativa'),
});

export type BenefitInput = z.infer<typeof BenefitSchema>;

// BUG 5 FIX: align with storage RLS policy which allows extensions:
// jpg/jpeg/png/gif/webp/svg/mp4/mov/webm/pdf.
// Schema must accept the same set so client-side validation doesn't reject
// files the storage policy would otherwise allow.
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
  'application/pdf',
] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const MediaUploadSchema = z.instanceof(File)
  .refine(f => f.size <= MAX_FILE_SIZE_BYTES, { message: `Arquivo muito grande. Máximo 5MB.` })
  .refine(f => (ALLOWED_MIME_TYPES as readonly string[]).includes(f.type), {
    message: `Tipo de arquivo não suportado. Use JPEG, PNG, GIF, WEBP, SVG, MP4, MOV, WEBM ou PDF.`,
  });

export type LoginInput = z.infer<typeof LoginSchema>;
export type CadastroInput = z.infer<typeof CadastroSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type PreCadastroInput = z.infer<typeof PreCadastroSchema>;
export type ColaborarInput = z.infer<typeof ColaborarSchema>;
