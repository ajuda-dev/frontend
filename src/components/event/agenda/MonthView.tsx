import type { AgendaEvent } from "../../../hooks/useAgendaEvents";
import {
  formatDate,
  formatWeekdayShort,
  isZonedToday,
  monthCells,
  slotDateTimeLocal,
  startOfZonedMonth,
  weekDays,
  zonedDateKey,
  zonedParts,
} from "../../../utils/format";
import { AgendaEventBlock } from "./AgendaEventBlock";
import { eventsOnDay } from "./layout";

const VISIBLE_PER_DAY = 3;

interface MonthViewProps {
  month: Date;
  events: AgendaEvent[];
  onCreateDay: (startAt: string) => void;
  onOpenDay: (day: Date) => void;
}

export function MonthView({ month, events, onCreateDay, onOpenDay }: MonthViewProps) {
  const labels = weekDays(month);
  const cells = monthCells(month);
  const currentMonth = zonedParts(startOfZonedMonth(month)).month;

  return (
    <div className="border-line flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
      <div className="border-line grid grid-cols-7 border-b">
        {labels.map((day) => (
          <div key={zonedDateKey(day)} className="text-ink-muted py-2 text-center text-[11px] font-medium">
            {formatWeekdayShort(day)}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {cells.map((cell) => {
          const key = zonedDateKey(cell.date);
          const today = isZonedToday(cell.date);
          const dayEvents = eventsOnDay(events, cell.date);
          const visible = dayEvents.slice(0, VISIBLE_PER_DAY);
          const extra = dayEvents.length - visible.length;
          const inCurrentMonth = zonedParts(cell.date).month === currentMonth;

          return (
            <div
              key={key}
              className={`border-line flex min-h-0 flex-col border-t border-l p-1 ${
                inCurrentMonth ? "bg-bg" : "bg-surface"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <button
                  type="button"
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    today ? "bg-brand text-bg" : inCurrentMonth ? "text-ink hover:bg-surface-2" : "text-ink-muted"
                  }`}
                  aria-label={`Abrir ${formatDate(cell.date.toISOString())}`}
                  onClick={() => onOpenDay(cell.date)}
                >
                  {zonedParts(cell.date).day}
                </button>
                <button
                  type="button"
                  className="text-ink-muted hover:text-ink rounded px-1 text-[10px]"
                  aria-label={`Criar evento em ${formatDate(cell.date.toISOString())}`}
                  onClick={() => onCreateDay(slotDateTimeLocal(cell.date, 9))}
                >
                  +
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                {visible.map((event) => (
                  <AgendaEventBlock key={event.id} event={event} compact />
                ))}
                {extra > 0 ? (
                  <button
                    type="button"
                    className="text-ink-muted hover:text-ink px-1 text-left text-[11px]"
                    onClick={() => onOpenDay(cell.date)}
                  >
                    +{extra}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
