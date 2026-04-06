// types/index.ts
import React from 'react';

export type MemberTier = 'presidente' | 'direcao' | 'secretario-geral' | 'vogal';

export type PartnerType = 'pessoa' | 'empresa';
export type PartnerCategory = 'Parceiro Platinum' | 'Parceiro Gold' | 'Parceiro Silver' | 'Apoio Público' | 'Outro Apoio' | 'Exposição' | 'Governança';

export interface SocialLinks {
  youtube?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

export interface MemberSeed {
  id: string;
  order: number;
  tier: MemberTier;
  name: string;
  role: string;
  summary: string;
  full: string;
  image?: string;
  country?: string;
  tags?: string[];
}

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  category: PartnerCategory;
  image?: string;
  role?: string;
  country?: string;
  bio?: string;
  website?: string;
  socialLinks?: SocialLinks;
  avatar?: string;
  tags?: string[];
  since?: string;
  active?: boolean;
  featured?: boolean;
  order?: number;
  tier?: MemberTier;
  summary?: string;
  full?: string;
}

export interface ContentBlock {
  id: string;
  title: string;
  summary: string;
  full: string;
}

export type Pillar = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
};

export type Space = {
  id: string;
  name: string;
  location: string;
  description: string;
  image: string;
};

export type EventCategory = '33 Anos' | 'Fundação' | 'Embaixada' | 'Outros';
export type MediaSource = 'oficial' | 'comunidade';
export type MediaStatus = 'published' | 'pending' | 'rejected';

export interface GalleryItem {
  id: string;
  kind: 'image' | 'video';
  srcType: 'url';
  url: string;
  caption?: string;
  authorName?: string;
  email?: string;
  source: MediaSource;
  status: MediaStatus;
  createdAt: string;
  order: number;
}

export interface EventLinks {
  registration?: string;
  website?: string;
  linkLabel?: string;
}

export interface Event {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  time?: string;
  endDate?: string;
  endTime?: string;
  location: string;
  address?: string;
  city?: string;
  country?: string;
  category: EventCategory;
  descriptionShort?: string;
  description: string;
  objective?: string;
  experience?: string;
  sponsorIds?: string[];
  tags?: string[];
  image: string;
  coverImage?: string;
  cardImage?: string;
  gallery: GalleryItem[];
  media?: any[];
  links?: EventLinks;
  socialLinks?: SocialLinks;
  status: 'draft' | 'published';
  featured: boolean;
  notes?: string;
}

export type RegistrationType = 'membro' | 'parceiro' | 'colaborador' | 'embaixador';

export interface PreCadastro {
  id: string;
  name: string;
  email: string;
  type: string;
  registrationType?: RegistrationType;
  message?: string;
  status: 'novo' | 'contatado' | 'aprovado' | 'rejeitado' | 'convertido';
  createdAt: string;
  notes?: string;
}

export type PendingMediaSubmission = {
  id: string;
  eventId: string;
  type: 'image' | 'video';
  url: string;
  authorName: string;
  email: string;
  message?: string;
  status?: 'pending' | 'approved' | 'rejected';
  userId?: string;
  createdAt: string;
};

export type AuthSession = {
  isLoggedIn: boolean;
  role: 'admin' | 'editor' | 'viewer';
  displayName?: string;
  lastLoginAt?: string;
  userId?: string;
};

export type ActivityLogItem = {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  user?: string;
};
