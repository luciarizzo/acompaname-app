import { Clapperboard } from 'lucide-react';

export function CinemaLoading({ message }: { message: string }) {
  return <div className="cinema-loading" role="status" aria-live="polite" aria-busy="true">
    <span className="cinema-loading-spinner" aria-hidden="true"><Clapperboard size={26}/></span>
    <div><strong>{message}</strong><p>Esto puede tardar unos segundos. Esperá un momento.</p></div>
  </div>;
}
