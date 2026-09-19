import { describe, expect, it } from "vitest";
import {
  addZonedDays,
  addZonedMonths,
  agendaRange,
  formatAddress,
  formatCep,
  formatDate,
  formatDateTime,
  formatHourLabel,
  formatMonthTitle,
  formatTime,
  formatWeekdayShort,
  fromZonedParts,
  minutesFromZonedMidnight,
  monthCells,
  parseDateKey,
  slotDateTimeLocal,
  startOfZonedMonth,
  startOfZonedWeek,
  toDateTimeLocal,
  weekDays,
  zonedDateKey,
  zonedParts,
} from "./format";

describe("formatDateTime / formatDate", () => {
  it("formata ISO com fuso fixo America/Sao_Paulo (independente da máquina)", () => {
    expect(formatDateTime("2026-09-15T14:30:00Z")).toBe("15/09/2026, 11:30");
    expect(formatDateTime("2026-09-15T14:30:00-03:00")).toBe("15/09/2026, 14:30");
    expect(formatDate("2026-09-15T14:30:00Z")).toBe("terça-feira, 15 de setembro de 2026");
  });
});

describe("calendário America/Sao_Paulo", () => {
  it("extrai partes no fuso fixo", () => {
    expect(zonedParts("2026-09-15T14:30:00Z")).toEqual({
      year: 2026,
      month: 9,
      day: 15,
      hour: 11,
      minute: 30,
    });
    expect(zonedParts("2026-09-15T14:30:00-03:00")).toEqual({
      year: 2026,
      month: 9,
      day: 15,
      hour: 14,
      minute: 30,
    });
  });

  it("semana começa no domingo", () => {
    const thursday = fromZonedParts(2026, 9, 17);
    const weekStart = startOfZonedWeek(thursday);
    expect(zonedDateKey(weekStart)).toBe("2026-09-13");
    expect(weekDays(thursday).map(zonedDateKey)).toEqual([
      "2026-09-13",
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
      "2026-09-19",
    ]);
  });

  it("grade do mês tem 42 células e começa no domingo anterior ao dia 1", () => {
    const cells = monthCells(fromZonedParts(2026, 9, 18));
    expect(cells).toHaveLength(42);
    expect(zonedDateKey(startOfZonedMonth(fromZonedParts(2026, 9, 18)))).toBe("2026-09-01");
    expect(zonedDateKey(cells[0].date)).toBe("2026-08-30");
    expect(cells[0].inMonth).toBe(false);
    expect(zonedDateKey(cells[2].date)).toBe("2026-09-01");
    expect(cells[2].inMonth).toBe(true);
  });

  it("formata título, weekday e hora em pt-BR", () => {
    expect(formatMonthTitle(fromZonedParts(2026, 9, 18))).toBe("Setembro de 2026");
    expect(formatWeekdayShort(fromZonedParts(2026, 9, 13))).toBe("DOM");
    expect(formatHourLabel(14)).toBe("14:00");
    expect(formatTime("2026-09-15T14:30:00-03:00")).toBe("14:30");
  });

  it("converte para datetime-local e monta slot no fuso do app", () => {
    expect(toDateTimeLocal("2026-09-15T14:30:00-03:00")).toBe("2026-09-15T14:30");
    expect(slotDateTimeLocal(fromZonedParts(2026, 10, 1), 9)).toBe("2026-10-01T09:00");
    expect(minutesFromZonedMidnight("2026-10-01T18:00:00-03:00")).toBe(18 * 60);
  });

  it("parseia YYYY-MM-DD e rejeita data inválida", () => {
    expect(zonedDateKey(parseDateKey("2026-09-18")!)).toBe("2026-09-18");
    expect(parseDateKey("2026-13-01")).toBeNull();
    expect(parseDateKey("não-é-data")).toBeNull();
  });

  it("avança dia e mês no calendário civil", () => {
    expect(zonedDateKey(addZonedDays(fromZonedParts(2026, 9, 30), 1))).toBe("2026-10-01");
    expect(zonedDateKey(addZonedMonths(fromZonedParts(2026, 1, 31), 1))).toBe("2026-02-28");
  });

  it("calcula o recorte visível de cada visão", () => {
    const anchor = fromZonedParts(2026, 9, 18);
    expect(zonedDateKey(agendaRange("day", anchor).start)).toBe("2026-09-18");
    expect(zonedDateKey(agendaRange("week", anchor).start)).toBe("2026-09-13");
    expect(zonedDateKey(agendaRange("month", anchor).start)).toBe("2026-08-30");
  });
});

describe("formatCep", () => {
  it("mascara 8 dígitos", () => {
    expect(formatCep("01310100")).toBe("01310-100");
    expect(formatCep("01310-100")).toBe("01310-100");
  });

  it("mantém valores fora do padrão", () => {
    expect(formatCep("123")).toBe("123");
  });
});

describe("formatAddress", () => {
  it("endereço completo", () => {
    expect(
      formatAddress({
        street: "Av. Paulista",
        number: "1000",
        complement: "Sala 5",
        city: "São Paulo",
        state: "SP",
      }),
    ).toBe("Av. Paulista, 1000 — Sala 5 · São Paulo/SP");
  });

  it("sem logradouro", () => {
    expect(formatAddress({ city: "Curitiba", state: "PR" })).toBe("Curitiba/PR");
  });

  it("nulo/vazio", () => {
    expect(formatAddress(null)).toBe("");
    expect(formatAddress(undefined)).toBe("");
  });
});
