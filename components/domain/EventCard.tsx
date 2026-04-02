// components/domain/EventCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import type { Event } from '../../types';

interface EventCardProps {
  event: Event;
}

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
};

export const EventCard: React.FC<EventCardProps> = ({ event }) => (
  <Link to={`/eventos/${event.id}`} className="group block h-full">
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:border-sand-400/50 hover:shadow-lg transition-all duration-500 hover:-translate-y-0.5 flex flex-col h-full">
      {event.image && (
        <div className="aspect-[16/9] overflow-hidden bg-slate-100">
          <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        </div>
      )}
      <div className="p-4 sm:p-5 flex flex-col flex-grow">
        <p className="text-[9px] font-bold uppercase tracking-widest text-sand-500 mb-2">{event.category}</p>
        <h3 className="text-base sm:text-lg font-serif text-brand-900 group-hover:text-sand-600 transition-colors mb-3 leading-snug">
          {event.title}
        </h3>
        {event.descriptionShort && (
          <p className="text-sm text-slate-500 font-light leading-relaxed line-clamp-2 mb-4 flex-grow">
            {event.descriptionShort}
          </p>
        )}
        <div className="flex flex-col gap-1.5 text-xs text-slate-400 mt-auto pt-3 border-t border-slate-100">
          {event.date && (
            <span className="flex items-center gap-2">
              <Calendar size={12} /> {formatDate(event.date)}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-2">
              <MapPin size={12} /> {event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  </Link>
);
