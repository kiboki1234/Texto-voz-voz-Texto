import { Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Cargando datos' }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-sm text-slate-500">
      <Loader2 className="mr-2 animate-spin" size={18} />
      {label}
    </div>
  );
}
