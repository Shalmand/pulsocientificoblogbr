// Aviso curto no rodapé da tela (o mesmo "toast" do protótipo).
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

const Ctx = createContext<(texto: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [texto, setTexto] = useState("");
  const [on, setOn] = useState(false);
  const timer = useRef<number>();
  const toast = useCallback((t: string) => {
    setTexto(t);
    setOn(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOn(false), 2600);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className={`toast${on ? " on" : ""}`} role="status" aria-live="polite">{texto}</div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
