// components/domain/Footer.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { subscribeToNewsletter } from '../../services/precadastros.service';
import { SocialIcons } from '../ui/Loaders';
import { BrandLogo } from './BrandLogo';

export const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      subscribeToNewsletter(email);
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-brand-900 text-white pt-24 pb-12 relative overflow-hidden border-t border-white/5">
      {/* Background with Darkened Photo Texture */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2670&auto=format&fit=crop"
          alt=""
          className="w-full h-full object-cover opacity-20 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-brand-900/95"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-brand-800 to-transparent rounded-full blur-[100px] opacity-50"></div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
        <div className="grid md:grid-cols-12 gap-12 mb-20">
          <div className="md:col-span-4 space-y-8">
            <BrandLogo variant="original" />
            <p className="text-white/40 font-light max-w-sm leading-relaxed text-sm">
              Promovendo a cultura, educação e inovação entre Portugal, Brasil e o mundo lusófono.
            </p>
            <div className="flex gap-4">
              <SocialIcons links={{ instagram: 'https://www.instagram.com/fundacao.lusobrasileira', facebook: 'https://www.facebook.com/Fund.LusoBrasileira', linkedin: 'https://linkedin.com' }} variant="light" size="sm" />
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/30">Fundação</h4>
            <ul className="space-y-4 text-sm font-light text-white/60">
              <li><Link to="/" className="hover:text-sand-400 transition-colors">Sobre Nós</Link></li>
              <li><Link to="/membros" className="hover:text-sand-400 transition-colors">Pessoas</Link></li>
              <li><Link to="/parceiros" className="hover:text-sand-400 transition-colors">Parceiros</Link></li>
              <li><Link to="/eventos" className="hover:text-sand-400 transition-colors">Agenda</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/30">Legal</h4>
            <ul className="space-y-4 text-sm font-light text-white/60">
              <li><Link to="/termos" className="hover:text-sand-400 transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="hover:text-sand-400 transition-colors">Privacidade</Link></li>
              <li><Link to="/precadastro" className="hover:text-sand-400 transition-colors">Trabalhe Conosco</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/30">Newsletter</h4>
            <p className="text-white/40 font-light text-sm">Receba atualizações sobre eventos e iniciativas.</p>
            {subscribed ? (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2">
                <Check size={16} /> Inscrito com sucesso.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sand-400 flex-grow placeholder:text-white/20"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="bg-sand-400 text-brand-900 px-4 py-3 rounded-xl font-bold hover:bg-white transition-colors">
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/20 font-light">
          <p>&copy; {new Date().getFullYear()} Fundação Luso-Brasileira. Todos os direitos reservados.</p>
          <p className="text-center">Plataforma desenvolvida por <span className="text-white/40 font-medium">LEGALTECH SPACE GROUP</span> — Parceira Tecnológica</p>
          <p>Lisboa &bull; Brasília</p>
        </div>
      </div>
    </footer>
  );
};
