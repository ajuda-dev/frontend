import { useEffect, useRef } from "react";
import type { AgendaEvent } from "../../../hooks/useAgendaEvents";
import {
  formatDate,
  formatHourLabel,
  formatWeekdayShort,
  isZonedToday,
  minutesFromZonedMidnight,
  slotDateTimeLocal,
  zonedDateKey,
  zonedParts,
} from "../../../utils/format";
import { AgendaEventBlock } from "./AgendaEventBlock";
import { HOUR_PX, HOURS, eventsOnDay, layoutDayEvents } from "./layout";

interface TimeGridProps {
  days: Date[];
  events: AgendaEvent[];
  now: Date;
  onCreateSlot: (startAt: string) => void;
}

export function TimeGrid({ days, events, now, onCreateSlot }: TimeGridProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const gridHeight = HOURS.length * HOUR_PX;
  const nowMinutes = minutesFromZonedMidnight(now);
  const showNow = days.some((day) => isZonedToday(day));

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const hour = showNow ? zonedParts(now).hour : 8;
    node.scrollTop = Math.max(0, hour * HOUR_PX - HOUR_PX);
  }, [days, now, showNow]);

  return (
    <div className="border-line flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
      <div
        className="border-line grid shrink-0 border-b"
        style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div />
        {days.map((day) => {
          const today = isZonedToday(day);
          return (
            <div key={zonedDateKey(day)} className="flex flex-col items-center gap-1 py-2">
              <span className="text-ink-muted text-[11px] font-medium tracking-wide">
                {formatWeekdayShort(day)}
              </span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  today ? "bg-brand text-bg" : "text-ink"
                }`}
              >
                {zonedParts(day).day}
              </span>
            </div>
          );
        })}
      </div>

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))`,
            height: gridHeight,
          }}
        >
          <div className="relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="text-ink-muted absolute right-2 -translate-y-1/2 text-[11px]"
                style={{ top: hour * HOUR_PX }}
              >
                {hour === 0 ? "" : formatHourLabel(hour)}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const today = isZonedToday(day);
            const laidOut = layoutDayEvents(eventsOnDay(events, day));
            return (
              <div
                key={zonedDateKey(day)}
                className={`border-line relative border-l ${today ? "bg-surface/40" : ""}`}
              >
                {HOURS.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    className="hover:bg-surface-2/60 border-line absolute right-0 left-0 border-b"
                    style={{ top: hour * HOUR_PX, height: HOUR_PX }}
                    aria-label={`Criar evento em ${formatDate(day.toISOString())} às ${formatHourLabel(hour)}`}
                    onClick={() => onCreateSlot(slotDateTimeLocal(day, hour))}
                  />
                ))}

                {laidOut.map((item) => (
                  <AgendaEventBlock
                    key={item.event.id}
                    event={item.event}
                    className="absolute z-10"
                    style={{
                      top: (item.startMin / 60) * HOUR_PX + 1,
                      height: Math.max(((item.endMin - item.startMin) / 60) * HOUR_PX - 2, 18),
                      left: `calc(${(item.lane / item.lanes) * 100}% + 2px)`,
                      width: `calc(${100 / item.lanes}% - 4px)`,
                    }}
                  />
                ))}

                {today ? (
                  <div
                    className="pointer-events-none absolute right-0 left-0 z-20 flex items-center"
                    style={{ top: (nowMinutes / 60) * HOUR_PX }}
                  >
                    <span className="bg-danger h-2 w-2 -translate-x-1 rounded-full" />
                    <span className="bg-danger h-px flex-1" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
