import type { AgendaEvent } from "../../../hooks/useAgendaEvents";
import { minutesFromZonedMidnight, zonedDateKey } from "../../../utils/format";

export const HOUR_PX = 48;
export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export interface LaidOutEvent {
  event: AgendaEvent;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
}

export function layoutDayEvents(events: AgendaEvent[]): LaidOutEvent[] {
  const items = events
    .map((event) => {
      const startMin = Math.max(0, minutesFromZonedMidnight(event.start_at));
      const rawEnd = startMin + Math.max(event.duration_min, 15);
      return { event, startMin, endMin: Math.min(24 * 60, rawEnd) };
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const laneEnds: number[] = [];
  const withLane = items.map((item) => {
    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMin);
    } else {
      laneEnds[lane] = item.endMin;
    }
    return { ...item, lane };
  });

  return withLane.map((item) => {
    let lanes = item.lane + 1;
    for (const other of withLane) {
      if (other.event.id === item.event.id) continue;
      if (other.startMin < item.endMin && other.endMin > item.startMin) {
        lanes = Math.max(lanes, other.lane + 1);
      }
    }
    return { ...item, lanes };
  });
}

export function eventsOnDay(events: AgendaEvent[], day: Date | string | number): AgendaEvent[] {
  const key = zonedDateKey(day);
  return events.filter((event) => zonedDateKey(event.start_at) === key);
}
