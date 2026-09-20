import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Field } from "./Field";
import { Input } from "./Input";
import { Modal } from "./Modal";
import { NoticeCard } from "./NoticeCard";

describe("Button", () => {
  it("aplica a classe da variante escolhida", () => {
    render(<Button variant="danger">Excluir</Button>);
    expect(screen.getByRole("button", { name: "Excluir" })).toHaveClass("bg-danger");
  });

  it("warning usa o token amarelo", () => {
    render(<Button variant="warning">Reagendar</Button>);
    expect(screen.getByRole("button", { name: "Reagendar" })).toHaveClass("bg-warning");
  });

  it("em loading fica desabilitado e não dispara o clique", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Salvar
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Salvar" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Field", () => {
  it("mostra o erro com role alert", () => {
    render(
      <Field label="Nome" htmlFor="name" error="Nome inválido">
        <Input id="name" />
      </Field>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Nome inválido");
  });

  it("mostra a dica quando não há erro", () => {
    render(
      <Field label="CEP" htmlFor="zip" hint="Somente números">
        <Input id="zip" />
      </Field>,
    );
    expect(screen.getByText("Somente números")).toBeInTheDocument();
  });
});

describe("NoticeCard", () => {
  it("pinta reagendamento de amarelo e recusa de vermelho", () => {
    const { rerender } = render(
      <NoticeCard tone="warning" title="Mentoria reagendada">
        Conflito de agenda
      </NoticeCard>,
    );
    expect(screen.getByRole("status")).toHaveClass("border-warning", "text-warning");
    expect(screen.getByText("Mentoria reagendada")).toBeInTheDocument();

    rerender(
      <NoticeCard tone="danger" title="Motivo da recusa">
        Sem horário
      </NoticeCard>,
    );
    expect(screen.getByRole("status")).toHaveClass("border-danger", "text-danger");
  });
});

describe("Badge", () => {
  it("usa a cor do tom informado", () => {
    render(<Badge tone="warning">Pendente</Badge>);
    expect(screen.getByText("Pendente")).toHaveClass("text-warning");
  });
});

describe("Modal", () => {
  it("renderiza o conteúdo quando aberto", () => {
    render(
      <Modal open title="Confirmar exclusão" onClose={() => {}}>
        <p>Tem certeza?</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Confirmar exclusão");
    expect(screen.getByText("Tem certeza?")).toBeInTheDocument();
  });

  it("não renderiza nada quando fechado", () => {
    render(
      <Modal open={false} title="Confirmar exclusão" onClose={() => {}}>
        <p>Tem certeza?</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fecha no Esc", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open title="Confirmar" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fecha no clique do backdrop e não no clique do painel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open title="Confirmar" onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>,
    );

    await user.click(screen.getByText("Conteúdo"));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("size lg aplica max-w-lg", () => {
    render(
      <Modal open title="Guia" onClose={() => {}} size="lg">
        <p>Passo</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("max-w-lg");
  });
});
