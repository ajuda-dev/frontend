import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import { EmailVerificationGate, EmailVerificationRequired } from "./EmailVerificationGate";

function seedSession(emailVerified: boolean) {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      emailVerified,
    }),
  );
}

function renderGate(emailVerified: boolean) {
  seedSession(emailVerified);
  return render(
    <MemoryRouter>
      <AuthProvider>
        <EmailVerificationGate>
          <button type="button">Ação gated</button>
        </EmailVerificationGate>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("EmailVerificationRequired", () => {
  it("mostra a mensagem e o link para confirmar e-mail", () => {
    render(
      <MemoryRouter>
        <EmailVerificationRequired />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Confirme seu e-mail para continuar");
    expect(screen.getByRole("link", { name: "Confirmar e-mail" })).toHaveAttribute(
      "href",
      "/confirmar-email",
    );
  });
});

describe("EmailVerificationGate", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("com e-mail verificado renderiza os filhos", () => {
    renderGate(true);
    expect(screen.getByRole("button", { name: "Ação gated" })).toBeInTheDocument();
    expect(screen.queryByText("Confirme seu e-mail para continuar")).not.toBeInTheDocument();
  });

  it("com e-mail pendente troca os filhos pelo aviso e o CTA", () => {
    renderGate(false);
    expect(screen.queryByRole("button", { name: "Ação gated" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Confirme seu e-mail para continuar");
    expect(screen.getByRole("link", { name: "Confirmar e-mail" })).toHaveAttribute(
      "href",
      "/confirmar-email",
    );
  });
});
