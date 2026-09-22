// /:categoria/:segundo pode ser subcategoria (/saude/doencas) ou matéria (/saude/anticorpo-contra-a-dengue…).
// Quem decide são os dados: se o segundo pedaço é uma categoria filha da primeira, é subcategoria;
// senão, é o endereço de uma matéria. As URLs não mudam.
import { useParams } from "react-router-dom";
import { useCats } from "@/lib/dados";
import { Carregando } from "@/components/Cartoes";
import Categoria from "./Categoria";
import Materia from "./Materia";

export default function SegundoNivel() {
  const { categoria = "", segundo = "" } = useParams();
  const cats = useCats();
  if (!cats.todas.length) return <section className="view on"><div className="wrap"><Carregando /></div></section>;
  const sub = cats.acharCat(segundo);
  if (sub && sub.pai === categoria) return <Categoria slugs={[categoria, segundo]} />;
  return <Materia editoria={categoria} slug={segundo} />;
}
