import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./toast";

/** Quem não entrou e tenta curtir, salvar, seguir ou comentar vai para a tela de login. */
export function usePedirLogin() {
  const toast = useToast();
  const nav = useNavigate();
  return useCallback((acao: string) => {
    toast(`Entre com o Google para ${acao}.`);
    nav("/entrar");
  }, [toast, nav]);
}
