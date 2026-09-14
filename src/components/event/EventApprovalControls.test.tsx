import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventItem } from "../../types/api";
import { EventApprovalControls } from "./EventApprovalControls";

vi.mock("../../services/event", () => ({
  approveEvent: vi.fn(),
}));

import { approveEvent } from "../../services/event";

const mockedApprove = vi.mocked(approveEvent);

function event(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: "e1",
    title: "Meetup Dev SP",
    description: "Encontro mensal",
    category: "COMMUNITY_EVENT",
    type: "ONLINE",
    start_at: "2026-10-01T18:00:00-03:00",
    duration_min: 60,
    status: "PENDING",
    ...overrides,
  };
}

describe("EventApprovalControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PENDING oferece Aprovar e Rejeitar", () => {
    render(<EventApprovalControls event={event()} onDecided={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Aprovar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejeitar" })).toBeInTheDocument();
  });

  it("REJECTED oferece só Aprovar (a única transição válida)", () => {
    render(<EventApprovalControls event={event({ status: "REJECTED" })} onDecided={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Aprovar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rejeitar" })).not.toBeInTheDocument();
  });

  it("aprovar chama a API e devolve o evento atualizado", async () => {
    const approved = event({ status: "APPROVED" });
    mockedApprove.mockResolvedValue(approved);
    const onDecided = vi.fn();
    const user = userEvent.setup();
    render(<EventApprovalControls event={event()} onDecided={onDecided} />);

    await user.click(screen.getByRole("button", { name: "Aprovar" }));

    expect(mockedApprove).toHaveBeenCalledWith("e1", "APPROVED");
    expect(onDecided).toHaveBeenCalledWith(approved);
  });

  it("rejeitar chama a API com REJECTED", async () => {
    const rejected = event({ status: "REJECTED" });
    mockedApprove.mockResolvedValue(rejected);
    const onDecided = vi.fn();
    const user = userEvent.setup();
    render(<EventApprovalControls event={event()} onDecided={onDecided} />);

    await user.click(screen.getByRole("button", { name: "Rejeitar" }));

    expect(mockedApprove).toHaveBeenCalledWith("e1", "REJECTED");
    expect(onDecided).toHaveBeenCalledWith(rejected);
  });

  it("erro mostra a mensagem traduzida e não chama onDecided", async () => {
    mockedApprove.mockRejectedValue(
      Object.assign(new Error("Request failed with status code 400"), {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            message: "invalid status transition from APPROVED to PENDING",
            code: 400,
          },
        },
      }),
    );
    const onDecided = vi.fn();
    const user = userEvent.setup();
    render(<EventApprovalControls event={event()} onDecided={onDecided} />);

    await user.click(screen.getByRole("button", { name: "Aprovar" }));

    expect(
      await screen.findByText("Esta ação não é permitida no estado atual da participação"),
    ).toBeInTheDocument();
    expect(onDecided).not.toHaveBeenCalled();
  });
});
