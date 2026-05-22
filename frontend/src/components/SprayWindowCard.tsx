import { ShieldCheck, ShieldX } from 'lucide-react';
import type { SprayWindow } from '../api/types';

export function SprayWindowCard({ data }: { data?: SprayWindow }) {
  if (!data) return null;
  const suitable = data.is_suitable;
  return (
    <section className={`rounded-3xl border-4 p-8 text-center shadow-card ${suitable ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'}`}>
      <div className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full ${suitable ? 'bg-emerald-200' : 'bg-red-200'}`}>
        {suitable ? (
          <ShieldCheck className="text-emerald-800" size={56} />
        ) : (
          <ShieldX className="text-red-800" size={56} />
        )}
      </div>
      <p className={`text-4xl font-black leading-tight sm:text-5xl ${suitable ? 'text-emerald-900' : 'text-red-900'}`}>
        {suitable ? 'HOY SÍ SE PUEDE\nFUMIGAR' : 'HOY NO FUMIGUE'}
      </p>
      {data.reasons.length > 0 && (
        <p className={`mx-auto mt-4 max-w-lg text-2xl font-semibold leading-snug ${suitable ? 'text-emerald-800' : 'text-red-800'}`}>
          {data.message}
        </p>
      )}
    </section>
  );
}
