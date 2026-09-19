import type { AgendaView } from "../../../utils/format";
import { Button } from "../../ui/Button";
import { Select } from "../../ui/Select";

interface AgendaToolbarProps {
  title: string;
  view: AgendaView;
  onViewChange: (view: AgendaView) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCreate: () => void;
}

const VIEW_OPTIONS: { value: AgendaView; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

export function AgendaToolbar({
  title,
  view,
  onViewChange,
  onToday,
  onPrev,
  onNext,
  onCreate,
}: AgendaToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <h1 className="text-ink text-xl font-semibold">Agenda</h1>
      <Button type="button" variant="ghost" size="sm" onClick={onToday}>
        Hoje
      </Button>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" aria-label="Período anterior" onClick={onPrev}>
          ‹
        </Button>
        <Button type="button" variant="ghost" size="sm" aria-label="Próximo período" onClick={onNext}>
          ›
        </Button>
      </div>
      <p className="text-ink text-base font-medium">{title}</p>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <label className="sr-only" htmlFor="agenda-view">
          Visão da agenda
        </label>
        <Select
          id="agenda-view"
          className="w-32"
          value={view}
          onChange={(event) => onViewChange(event.target.value as AgendaView)}
        >
          {VIEW_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button type="button" variant="primary" size="sm" onClick={onCreate}>
          + Criar
        </Button>
      </div>
    </div>
  );
}
