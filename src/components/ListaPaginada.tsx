// Lista grande de matérias com "Carregar mais" (categoria, tag, busca, novidades).
import { useState, type ReactNode } from "react";
import type { Materia } from "@/lib/tipos";
import { ItemLista } from "./Cartoes";

export const POR_PAGINA = 12;

export function ListaPaginada({ materias, corCat, vazio }: { materias: Materia[]; corCat?: string; vazio: ReactNode }) {
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  if (!materias.length) return <>{vazio}</>;
  return (
    <>
      <div className="list-big">{materias.slice(0, mostrar).map((m) => <ItemLista key={m.id} m={m} corCat={corCat} />)}</div>
      {materias.length > mostrar && (
        <div className="carregar-mais">
          <button type="button" className="btn-ghost" onClick={() => setMostrar((n) => n + POR_PAGINA)}>
            Carregar mais <small>({materias.length - mostrar})</small>
          </button>
        </div>
      )}
    </>
  );
}
