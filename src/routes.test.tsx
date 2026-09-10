import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "./routes";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("AppRoutes", () => {
  it("renderiza a home com o wordmark", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: "<AJUDA.DEV/>" })).toBeInTheDocument();
    expect(screen.getByText("Comunidades, eventos e mentoria — em breve.")).toBeInTheDocument();
  });

  it("rota inexistente mostra página não encontrada", () => {
    renderAt("/rota-inexistente");
    expect(screen.getByText("Página não encontrada.")).toBeInTheDocument();
  });
});
