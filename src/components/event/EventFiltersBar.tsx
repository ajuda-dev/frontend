import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { EVENT_CATEGORIES, EVENT_TYPES } from "../../types/api";
import type { EventCategory, EventType } from "../../types/api";
import { EVENT_CATEGORY_LABEL, EVENT_TYPE_LABEL } from "../../utils/labels";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export interface EventFilters {
  category: EventCategory | "";
  type: EventType | "";
  city: string;
  upcoming: boolean;
}

function isCategory(value: string | null): value is EventCategory {
  return value !== null && (EVENT_CATEGORIES as readonly string[]).includes(value);
}

function isType(value: string | null): value is EventType {
  return value !== null && (EVENT_TYPES as readonly string[]).includes(value);
}

// A URL é a fonte dos filtros: o link filtrado é compartilhável e o refresh preserva
// a seleção. Os selects escrevem direto no searchParams; a cidade passa por debounce
// para não disparar uma requisição por tecla.
export function EventFiltersBar() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get("category");
  const type = searchParams.get("type");
  const upcoming = searchParams.get("upcoming") === "true";
  const cityParam = searchParams.get("city") ?? "";

  const [cityDraft, setCityDraft] = useState<string | null>(null);
  const city = cityDraft ?? cityParam;
  const debouncedCity = useDebouncedValue(city, 400);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const trimmed = debouncedCity.trim();
    if (trimmed === cityParam) return;
    updateParam("city", trimmed || null);
  }, [debouncedCity, cityParam, updateParam]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Categoria" htmlFor="event-category">
        <Select
          id="event-category"
          name="category"
          value={isCategory(category) ? category : ""}
          onChange={(event) => updateParam("category", event.target.value || null)}
        >
          <option value="">Todas</option>
          {EVENT_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {EVENT_CATEGORY_LABEL[value]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Formato" htmlFor="event-type">
        <Select
          id="event-type"
          name="type"
          value={isType(type) ? type : ""}
          onChange={(event) => updateParam("type", event.target.value || null)}
        >
          <option value="">Todos</option>
          {EVENT_TYPES.map((value) => (
            <option key={value} value={value}>
              {EVENT_TYPE_LABEL[value]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Cidade"
        htmlFor="event-city"
        hint="Comparação exata com a cidade cadastrada no endereço do evento."
      >
        <Input
          id="event-city"
          name="city"
          value={city}
          placeholder="Ex.: São Paulo"
          onChange={(event) => setCityDraft(event.target.value)}
        />
      </Field>

      <div className="flex items-end pb-2">
        <label className="text-ink flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="upcoming"
            checked={upcoming}
            onChange={(event) => updateParam("upcoming", event.target.checked ? "true" : null)}
            className="accent-brand h-4 w-4"
          />
          Somente futuros
        </label>
      </div>
    </div>
  );
}
