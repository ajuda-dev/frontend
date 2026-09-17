import { useCallback, useMemo, useState } from "react";
import { isApiError } from "../services/api";
import { joinCommunity, leaveCommunity } from "../services/community";
import { apiErrorMessage } from "../utils/apiError";

const STORAGE_PREFIX = "ajudadev.memberships.";

export interface MembershipNotice {
  tone: "info" | "error";
  message: string;
}

export interface UseMembershipsResult {
  isMember: (communityId: string) => boolean;
  join: (communityId: string) => Promise<void>;
  leave: (communityId: string) => Promise<void>;
  forget: (communityId: string) => void;
  pendingId: string | null;
  notice: MembershipNotice | null;
  dismissNotice: () => void;
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function readStoredIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function writeStoredIds(userId: string, ids: string[]): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(ids));
  } catch {
    // Sem localStorage disponível o cache vive só em memória nesta sessão.
  }
}

function statusOf(error: unknown): number | undefined {
  return isApiError(error) ? error.response?.status : undefined;
}

// Não há endpoint de listagem de memberships: o estado "sou membro" é um cache
// local por usuário, reconciliado pelas respostas de join/leave.
export function useMemberships(userId: string | null | undefined): UseMembershipsResult {
  const [state, setState] = useState<{ userId: string | null; ids: string[] }>(() => ({
    userId: userId ?? null,
    ids: userId ? readStoredIds(userId) : [],
  }));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<MembershipNotice | null>(null);

  // Troca de usuário é ajustada durante o render (padrão de estado derivado),
  // sem efeito: evita um render extra com o cache da conta anterior.
  if (state.userId !== (userId ?? null)) {
    setState({ userId: userId ?? null, ids: userId ? readStoredIds(userId) : [] });
    setNotice(null);
  }

  const ids = state.ids;

  const persist = useCallback(
    (next: string[]) => {
      setState({ userId: userId ?? null, ids: next });
      if (userId) writeStoredIds(userId, next);
    },
    [userId],
  );

  const isMember = useCallback((communityId: string) => ids.includes(communityId), [ids]);

  const join = useCallback(
    async (communityId: string) => {
      if (!userId) return;
      setPendingId(communityId);
      setNotice(null);
      try {
        await joinCommunity(communityId);
        persist(Array.from(new Set([...ids, communityId])));
      } catch (error) {
        const status = statusOf(error);
        if (status === 400) {
          // 400 no join significa que a linha de membership já existe: reconciliar como membro.
          persist(Array.from(new Set([...ids, communityId])));
          setNotice({ tone: "info", message: "Você já é membro desta comunidade." });
        } else if (status === 404) {
          setNotice({ tone: "error", message: "Comunidade não encontrada." });
        } else if (status === 403) {
          setNotice({ tone: "error", message: apiErrorMessage(error) });
        } else {
          setNotice({ tone: "error", message: "Não foi possível entrar na comunidade." });
        }
      } finally {
        setPendingId(null);
      }
    },
    [ids, persist, userId],
  );

  const leave = useCallback(
    async (communityId: string) => {
      if (!userId) return;
      setPendingId(communityId);
      setNotice(null);
      try {
        await leaveCommunity(communityId);
        persist(ids.filter((id) => id !== communityId));
      } catch (error) {
        const status = statusOf(error);
        if (status === 404) {
          persist(ids.filter((id) => id !== communityId));
          setNotice({ tone: "info", message: "Você não era membro desta comunidade." });
        } else {
          setNotice({ tone: "error", message: "Não foi possível sair da comunidade." });
        }

      } finally {
        setPendingId(null);
      }
    },
    [ids, persist, userId],
  );

  const dismissNotice = useCallback(() => setNotice(null), []);

  // Usado após excluir a comunidade: o id deixa de existir no backend.
  const forget = useCallback(
    (communityId: string) => {
      if (!ids.includes(communityId)) return;
      persist(ids.filter((id) => id !== communityId));
    },
    [ids, persist],
  );

  return useMemo(
    () => ({ isMember, join, leave, forget, pendingId, notice, dismissNotice }),
    [isMember, join, leave, forget, pendingId, notice, dismissNotice],
  );
}
