import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { OnboardingTour } from "./OnboardingTour";
import { AuthProvider } from "../../context/AuthContext";
import { OnboardingProvider } from "../../context/OnboardingContext";
import { useOnboarding } from "../../hooks/useOnboarding";
import { onboardingStorageKey } from "../../onboarding/storage";

function seedSession() {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      emailVerified: true,
    }),
  );
}

function markSeen() {
  localStorage.setItem(onboardingStorageKey("u1"), JSON.stringify({ seen: true }));
}

function ReplayButton() {
  const { start } = useOnboarding();
  return (
    <button type="button" onClick={start}>
      Reabrir
    </button>
  );
}

function renderTour() {
  return render(
    <AuthProvider>
      <OnboardingProvider>
        <OnboardingTour />
        <ReplayButton />
      </OnboardingProvider>
    </AuthProvider>,
  );
}

describe("OnboardingTour", () => {
  beforeEach(() => {
    localStorage.clear();
    seedSession();
  });

  it("abre se o usuário ainda não viu o guia", () => {
    renderTour();
    expect(screen.getByRole("dialog", { name: "Bem-vindo ao AjudaDev" })).toBeInTheDocument();
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
  });

  it("Próximo avança o slide", async () => {
    const user = userEvent.setup();
    renderTour();

    await user.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByRole("dialog", { name: "Comunidades" })).toBeInTheDocument();
    expect(screen.getByText("2 / 5")).toBeInTheDocument();
  });

  it("Pular grava a chave e fecha", async () => {
    const user = userEvent.setup();
    renderTour();

    await user.click(screen.getByRole("button", { name: "Pular" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(onboardingStorageKey("u1")) ?? "{}")).toEqual({
      seen: true,
    });
  });

  it("Começar no último passo grava a chave e fecha", async () => {
    const user = userEvent.setup();
    renderTour();

    for (let i = 0; i < 4; i += 1) {
      await user.click(screen.getByRole("button", { name: "Próximo" }));
    }

    expect(screen.getByRole("dialog", { name: "Perfil e avisos" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pular" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Começar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(onboardingStorageKey("u1")) ?? "{}")).toEqual({
      seen: true,
    });
  });

  it("não abre de novo no segundo mount depois de visto", () => {
    markSeen();
    const { unmount } = renderTour();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    unmount();
    renderTour();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("start reabre sem apagar a chave até o dismiss", async () => {
    const user = userEvent.setup();
    markSeen();
    renderTour();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reabrir" }));
    expect(screen.getByRole("dialog", { name: "Bem-vindo ao AjudaDev" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(onboardingStorageKey("u1")) ?? "{}")).toEqual({
      seen: true,
    });

    await user.click(screen.getByRole("button", { name: "Pular" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(onboardingStorageKey("u1")) ?? "{}")).toEqual({
      seen: true,
    });
  });
});
