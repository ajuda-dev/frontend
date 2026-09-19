import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AgendaToolbar } from "../../components/event/agenda/AgendaToolbar";
import { MiniMonth } from "../../components/event/agenda/MiniMonth";
import { MonthView } from "../../components/event/agenda/MonthView";
import { TimeGrid } from "../../components/event/agenda/TimeGrid";
import { Alert } from "../../components/ui/Alert";
import { useAuth } from "../../context/useAuth";
import { useAgendaEvents } from "../../hooks/useAgendaEvents";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import {
  addZonedDays,
  addZonedMonths,
  formatDate,
  formatMonthTitle,
  parseDateKey,
  startOfZonedDay,
  startOfZonedMonth,
  weekDays,
  zonedDateKey,
  type AgendaView,
} from "../../utils/format";

function parseView(raw: string | null): AgendaView {
  if (raw === "day" || raw === "month" || raw === "week") return raw;
  return "week";
}

export function MyAgendaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { events, loading, error, reload } = useAgendaEvents(user?.id ?? "");
  const [now, setNow] = useState(() => new Date());

  const view = parseView(params.get("view"));
  const dateKey = params.get("date") ?? "";
  const anchor = useMemo(
    () => parseDateKey(dateKey) ?? startOfZonedDay(new Date()),
    [dateKey],
  );
  const [miniMonth, setMiniMonth] = useState(() => startOfZonedMonth(anchor));
  const days = useMemo(() => (view === "day" ? [anchor] : weekDays(anchor)), [view, anchor]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const eventDays = useMemo(
    () => new Set(events.map((event) => zonedDateKey(event.start_at))),
    [events],
  );

  function goTo(date: Date, nextView: AgendaView = view) {
    setMiniMonth(startOfZonedMonth(date));
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("view", nextView);
        next.set("date", zonedDateKey(date));
        return next;
      },
      { replace: true },
    );
  }

  function shift(delta: number) {
    if (view === "day") goTo(addZonedDays(anchor, delta));
    else if (view === "week") goTo(addZonedDays(anchor, delta * 7));
    else goTo(addZonedMonths(anchor, delta));
  }

  function openCreate(startAt?: string) {
    const query = startAt ? `?start_at=${encodeURIComponent(startAt)}` : "";
    navigate(`/eventos/novo${query}`);
  }

  const title = view === "day" ? formatDate(anchor.toISOString()) : formatMonthTitle(anchor);
  const detail = apiErrorDetail(error);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <AgendaToolbar
        title={title}
        view={view}
        onViewChange={(next) => goTo(anchor, next)}
        onToday={() => goTo(startOfZonedDay(new Date()))}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        onCreate={() => openCreate()}
      />

      {error ? (
        <Alert
          variant="error"
          title="Não foi possível carregar sua agenda"
          action={
            <button type="button" onClick={reload} className="text-brand text-sm hover:underline">
              Tentar novamente
            </button>
          }
        >
          {apiErrorMessage(error)}
          {detail ? <span className="block text-xs">{detail}</span> : null}
        </Alert>
      ) : null}

      {loading && events.length === 0 && !error ? (
        <p className="text-ink-muted sr-only">Carregando agenda</p>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="hidden lg:block">
          <MiniMonth
            month={miniMonth}
            selected={anchor}
            eventDays={eventDays}
            onMonthChange={setMiniMonth}
            onSelectDay={(day) => goTo(day)}
          />
        </div>

        {view === "month" ? (
          <MonthView
            month={anchor}
            events={events}
            onCreateDay={openCreate}
            onOpenDay={(day) => goTo(day, "day")}
          />
        ) : (
          <TimeGrid days={days} events={events} now={now} onCreateSlot={openCreate} />
        )}
      </div>
    </div>
  );
}
