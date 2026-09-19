import {
  addZonedMonths,
  formatMonthTitle,
  formatWeekdayShort,
  isSameZonedDay,
  isZonedToday,
  monthCells,
  weekDays,
  zonedDateKey,
  zonedParts,
} from "../../../utils/format";
import { Button } from "../../ui/Button";

interface MiniMonthProps {
  month: Date;
  selected: Date;
  eventDays: Set<string>;
  onMonthChange: (month: Date) => void;
  onSelectDay: (day: Date) => void;
}

export function MiniMonth({ month, selected, eventDays, onMonthChange, onSelectDay }: MiniMonthProps) {
  const labels = weekDays(month);
  const cells = monthCells(month);

  return (
    <div className="flex w-60 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-ink text-sm font-medium">{formatMonthTitle(month)}</p>
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Mês anterior"
            onClick={() => onMonthChange(addZonedMonths(month, -1))}
          >
            ‹
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Próximo mês"
            onClick={() => onMonthChange(addZonedMonths(month, 1))}
          >
            ›
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {labels.map((day) => (
          <span key={zonedDateKey(day)} className="text-ink-muted text-[10px] font-medium">
            {formatWeekdayShort(day)}
          </span>
        ))}
        {cells.map((cell) => {
          const key = zonedDateKey(cell.date);
          const today = isZonedToday(cell.date);
          const selectedDay = isSameZonedDay(cell.date, selected);
          const hasEvent = eventDays.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(cell.date)}
              className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                selectedDay
                  ? "bg-brand text-bg"
                  : today
                    ? "text-brand ring-brand ring-1"
                    : cell.inMonth
                      ? "text-ink hover:bg-surface-2"
                      : "text-ink-muted hover:bg-surface-2"
              }`}
              aria-current={today ? "date" : undefined}
              aria-pressed={selectedDay}
            >
              {zonedParts(cell.date).day}
              {hasEvent ? (
                <span
                  className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                    selectedDay ? "bg-bg" : "bg-brand"
                  }`}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
