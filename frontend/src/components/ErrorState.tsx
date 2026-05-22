import { AlertCircle } from 'lucide-react';

export function ErrorState({ label = 'No se pudo cargar esta seccion' }: { label?: string }) {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm text-red-700">
      <AlertCircle className="mr-2" size={18} />
      {label}
    </div>
  );
}
