import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { EventUser } from "../../types/api";
import { ParticipantComment } from "./ParticipantComment";

function entry(overrides: Partial<EventUser> = {}): EventUser {
  return {
    id: "p1",
    event_id: "e1",
    user_id: "u1",
    role: "ATTENDEE",
    status: "CONFIRMED",
    comment: "Nos falamos pelo chat",
    comment_kind: "NOTE",
    user: {
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      photo: "https://exemplo.com/lucas.png",
    },
    ...overrides,
  };
}

function renderComment(row: EventUser) {
  return render(
    <MemoryRouter>
      <ParticipantComment entry={row} />
    </MemoryRouter>,
  );
}

describe("ParticipantComment", () => {
  it("mostra foto, nome e tag de papel ao lado do texto", () => {
    renderComment(entry());

    expect(screen.getByRole("img", { name: "Foto de Lucas Rocha" })).toHaveAttribute(
      "src",
      "https://exemplo.com/lucas.png",
    );
    expect(screen.getByRole("link", { name: "Lucas Rocha" })).toHaveAttribute("href", "/pessoas/u1");
    expect(screen.getByText("Participante")).toBeInTheDocument();
    expect(screen.getByText("Nos falamos pelo chat")).toBeInTheDocument();
    expect(screen.queryByText("Comentário")).not.toBeInTheDocument();
  });

  it("sem foto cai nas iniciais do nome", () => {
    renderComment(
      entry({
        user: { id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" },
      }),
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("LR")).toBeInTheDocument();
  });

  it("recusa usa borda vermelha e o chip Recusa", () => {
    renderComment(
      entry({
        role: "MENTEE",
        status: "REJECTED",
        comment: "Agenda conflitou",
        comment_kind: "REJECT",
      }),
    );

    expect(screen.getByText("Recusa")).toBeInTheDocument();
    expect(screen.getByText("Mentorado")).toBeInTheDocument();
    expect(screen.getByText("Agenda conflitou").closest("[role=status]")).toHaveClass("border-danger");
  });

  it("reagendamento usa borda amarela e o chip Reagendamento", () => {
    renderComment(
      entry({
        role: "MENTOR",
        comment: "vamos deixar para semana que vem",
        comment_kind: "RESCHEDULE",
      }),
    );

    expect(screen.getByText("Reagendamento")).toBeInTheDocument();
    expect(screen.getByText("Mentor")).toBeInTheDocument();
    expect(screen.getByText("vamos deixar para semana que vem").closest("[role=status]")).toHaveClass(
      "border-warning",
    );
  });

  it("sem comentário não renderiza nada", () => {
    const { container } = renderComment(entry({ comment: undefined, comment_kind: undefined }));
    expect(container).toBeEmptyDOMElement();
  });
});
