import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { EventItem } from "../../types/api";
import { EventCard } from "./EventCard";

function event(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: "e1",
    title: "Meetup Dev SP",
    description: "Encontro mensal",
    category: "COMMUNITY_EVENT",
    type: "ONLINE",
    start_at: "2026-10-01T18:00:00-03:00",
    duration_min: 60,
    ...overrides,
  };
}

function renderCard(item: EventItem, compact = false) {
  return render(
    <MemoryRouter>
      <EventCard event={item} compact={compact} />
    </MemoryRouter>,
  );
}

describe("EventCard", () => {
  it("PENDING mostra o badge de aguardando aprovação", () => {
    renderCard(event({ status: "PENDING" }));

    expect(screen.getByText("Aguardando aprovação")).toBeInTheDocument();
  });

  it("REJECTED mostra o badge de rejeitado", () => {
    renderCard(event({ status: "REJECTED" }));

    expect(screen.getByText("Rejeitado")).toBeInTheDocument();
  });

  it("APPROVED não mostra badge de aprovação", () => {
    renderCard(event({ status: "APPROVED" }));

    expect(screen.queryByText("Aguardando aprovação")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejeitado")).not.toBeInTheDocument();
  });

  it("status ausente (tratado como aprovado) não mostra badge", () => {
    renderCard(event());

    expect(screen.queryByText("Aguardando aprovação")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejeitado")).not.toBeInTheDocument();
  });

  it("a variante compacta também mostra o badge", () => {
    renderCard(event({ status: "PENDING" }), true);

    expect(screen.getByText("Aguardando aprovação")).toBeInTheDocument();
  });
});
