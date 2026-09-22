// Se um pedaço da tela quebrar, mostra um aviso com botão de recarregar em vez de deixar a página em branco.
import { Component, type ReactNode } from "react";

export class ErroTela extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() { return { erro: true }; }
  componentDidCatch(e: unknown) { console.error("Erro na tela:", e); }
  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <section className="view on"><div className="wrap" style={{ padding: "80px 0", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--f-display, inherit)", marginBottom: 12 }}>Algo não carregou direito</h1>
        <p style={{ color: "var(--muted)", marginBottom: 24 }}>Recarregue a página. Se continuar, volte ao início e tente de novo.</p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>Recarregar</button>{" "}
        <a className="btn-ghost" href="/">Ir para o início</a>
      </div></section>
    );
  }
}
