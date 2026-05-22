import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HuacaWarningModalProps {
  active: boolean;
  context: 'cientifico' | 'gad' | 'agricultor';
}

const contextText = {
  cientifico: 'Los gráficos y comparaciones deben tratar los nutrientes de HUACA como datos referenciales.',
  gad: 'En la vista territorial, HUACA debe interpretarse como una estación con datos de suelo no comparables directamente.',
  agricultor: 'Para HUACA, el diagnóstico de suelo es orientativo. No tome decisiones de fertilización solo con esos valores.',
};

export function HuacaWarningModal({ active, context }: HuacaWarningModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (active) setOpen(true);
    if (!active) setOpen(false);
  }, [active, context]);

  if (!active || !open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section className="w-full max-w-lg rounded-md border border-amber-300 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-amber-100 p-2 text-amber-700">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-lg font-bold text-ink">Aviso sobre HUACA</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                Esta estación usa sensores y unidades distintas para nutrientes del suelo. Sus valores pueden verse mucho más bajos y no deben compararse directamente con las demás estaciones.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{contextText[context]}</p>
            </div>
          </div>
          <button
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            onClick={() => setOpen(false)}
            aria-label="Cerrar aviso HUACA"
          >
            <X size={20} />
          </button>
        </div>
        <button
          className="focus-ring mt-5 w-full rounded-md bg-ink px-4 py-2 text-sm font-bold text-white"
          onClick={() => setOpen(false)}
        >
          Entendido
        </button>
      </section>
    </div>
  );
}
