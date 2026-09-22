import { Link } from "react-router-dom";
import { useSeo } from "@/lib/seo";

export default function NaoEncontrada({ texto = "Página não encontrada." }: { texto?: string }) {
  useSeo({ titulo: "Página não encontrada", descricao: texto, semIndice: true });
  return (
    <section className="view on">
      <div className="wrap">
        <p style={{ padding: "60px 0" }}>{texto} <Link to="/" className="link-sm">Voltar para o início</Link></p>
      </div>
    </section>
  );
}
