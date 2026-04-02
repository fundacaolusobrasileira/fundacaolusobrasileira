// validation/schemas.ts
import { z } from 'zod';

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

export type LoginInput = z.infer<typeof LoginSchema>;
export type CadastroInput = z.infer<typeof CadastroSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type PreCadastroInput = z.infer<typeof PreCadastroSchema>;
export type ColaborarInput = z.infer<typeof ColaborarSchema>;
