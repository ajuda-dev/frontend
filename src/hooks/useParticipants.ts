import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InvitableRole } from "../services/eventUser";
import {
  addParticipant,
  cancelParticipation,
  getParticipants,
  joinEvent,
  updateParticipantComment,
  updateParticipantStatus,
} from "../services/eventUser";
import type { EventUser } from "../types/api";
import { apiErrorMessage } from "../utils/apiError";

export interface ParticipationFailure {
  key: string;
  message: string;
}

export interface UseParticipantsResult {
  participants: EventUser[];
  loading: boolean;
  error: unknown;
  myRow: EventUser | null;
  confirmedCount: number;
  isPending: (key: string) => boolean;
  failure: ParticipationFailure | null;
  clearFailure: () => void;
  refetch: () => void;
  join: () => Promise<boolean>;
  cancel: () => Promise<boolean>;
  accept: (comment?: string) => Promise<boolean>;
  reject: (comment: string) => Promise<boolean>;
  saveComment: (comment: string) => Promise<boolean>;
  add: (userId: string, role: InvitableRole) => Promise<boolean>;
  remove: (userId: string) => Promise<boolean>;
}

// A lista de participantes da API não é paginada: o hook busca tudo de uma vez
// (aceitável no porte atual) e refaz a busca após cada mutação — ela é a fonte
// de verdade do meu papel/status e da contagem de vagas. As chaves de ação
// ("join", "accept", "add", "remove:<id>"...) carregam loading/erro próprios,
// então uma ação em andamento não bloqueia as demais.
export function useParticipants(
  eventId: string,
  userId?: string | null,
  onMutated?: () => void,
): UseParticipantsResult {
  const [state, setState] = useState<{ eventId: string; participants: EventUser[] }>(() => ({
    eventId,
    participants: [],
  }));
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState<unknown>(null);
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [failure, setFailure] = useState<ParticipationFailure | null>(null);

  const requestIdRef = useRef(0);
  const onMutatedRef = useRef(onMutated);

  useEffect(() => {
    onMutatedRef.current = onMutated;
  }, [onMutated]);

  // Troca de evento é ajustada durante o render (padrão de estado derivado):
  // evita um render extra carregando a lista do evento anterior.
  if (state.eventId !== eventId) {
    setState({ eventId, participants: [] });
    setLoading(Boolean(eventId));
    setError(null);
    setFailure(null);
    setPendingKeys([]);
  }

  const participants = state.participants;

  const fetchParticipants = useCallback(async () => {
    if (!eventId) return;
    const requestId = ++requestIdRef.current;
    try {
      const data = await getParticipants(eventId);
      if (requestId !== requestIdRef.current) return;
      setState({ eventId, participants: data });
      setError(null);
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      setError(caught);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    // Mesmo padrão do usePageable: adia o fetch para um macrotask para não
    // fazer setState síncrono dentro do efeito (lint react/set-state-in-effect).
    const timer = setTimeout(() => {
      void fetchParticipants();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchParticipants]);

  const runAction = useCallback(
    async (key: string, action: () => Promise<unknown>): Promise<boolean> => {
      setPendingKeys((keys) => (keys.includes(key) ? keys : [...keys, key]));
      setFailure(null);
      let succeeded = false;
      try {
        await action();
        succeeded = true;
      } catch (caught) {
        setFailure({ key, message: apiErrorMessage(caught) });
      } finally {
        // Refaz a busca mesmo em falha: o estado local pode estar desatualizado
        // (ex.: "já é participante") e a lista concilia sozinha.
        await fetchParticipants();
        setPendingKeys((keys) => keys.filter((item) => item !== key));
      }
      if (succeeded) onMutatedRef.current?.();
      return succeeded;
    },
    [fetchParticipants],
  );

  const join = useCallback(() => {
    if (!userId) return Promise.resolve(false);
    return runAction("join", () => joinEvent(eventId));
  }, [eventId, runAction, userId]);

  const cancel = useCallback(() => {
    if (!userId) return Promise.resolve(false);
    return runAction("cancel", () => cancelParticipation(eventId, userId));
  }, [eventId, runAction, userId]);

  const accept = useCallback(
    (comment?: string) => {
      if (!userId) return Promise.resolve(false);
      return runAction("accept", () =>
        comment === undefined
          ? updateParticipantStatus(eventId, userId, "CONFIRMED")
          : updateParticipantStatus(eventId, userId, "CONFIRMED", comment),
      );
    },
    [eventId, runAction, userId],
  );

  const reject = useCallback(
    (comment: string) => {
      if (!userId) return Promise.resolve(false);
      return runAction("reject", () =>
        updateParticipantStatus(eventId, userId, "REJECTED", comment),
      );
    },
    [eventId, runAction, userId],
  );

  const saveComment = useCallback(
    (comment: string) => {
      if (!userId) return Promise.resolve(false);
      return runAction("comment", () => updateParticipantComment(eventId, userId, comment));
    },
    [eventId, runAction, userId],
  );

  const add = useCallback(
    (targetUserId: string, role: InvitableRole) =>
      runAction("add", () => addParticipant(eventId, { userId: targetUserId, role })),
    [eventId, runAction],
  );

  const remove = useCallback(
    (targetUserId: string) =>
      runAction(`remove:${targetUserId}`, () => cancelParticipation(eventId, targetUserId)),
    [eventId, runAction],
  );

  const refetch = useCallback(() => {
    setLoading(true);
    void fetchParticipants();
  }, [fetchParticipants]);

  const clearFailure = useCallback(() => setFailure(null), []);

  const isPending = useCallback((key: string) => pendingKeys.includes(key), [pendingKeys]);

  const myRow = useMemo(() => {
    if (!userId) return null;
    return participants.find((entry) => entry.user_id === userId) ?? null;
  }, [participants, userId]);

  const confirmedCount = useMemo(
    () => participants.filter((entry) => entry.status === "CONFIRMED").length,
    [participants],
  );

  return {
    participants,
    loading,
    error,
    myRow,
    confirmedCount,
    isPending,
    failure,
    clearFailure,
    refetch,
    join,
    cancel,
    accept,
    reject,
    saveComment,
    add,
    remove,
  };
}
