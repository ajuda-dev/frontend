import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("renderiza a imagem com alt do nome quando há src", () => {
    render(<Avatar name="Lucas Rocha" src="https://exemplo.com/foto.png" />);

    const image = screen.getByRole("img", { name: "Foto de Lucas Rocha" });
    expect(image).toHaveAttribute("src", "https://exemplo.com/foto.png");
  });

  it("sem src mostra as iniciais do primeiro e do último nome", () => {
    render(<Avatar name="Lucas Rocha" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("LR")).toBeInTheDocument();
  });

  it("nome de uma palavra usa as duas primeiras letras", () => {
    render(<Avatar name="Lucas" />);

    expect(screen.getByText("LU")).toBeInTheDocument();
  });

  it("nome vazio cai no placeholder", () => {
    render(<Avatar name="   " />);

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("imagem que falha ao carregar cai nas iniciais", () => {
    render(<Avatar name="Lucas Rocha" src="https://exemplo.com/quebrada.png" />);

    fireEvent.error(screen.getByRole("img", { name: "Foto de Lucas Rocha" }));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("LR")).toBeInTheDocument();
  });

  it("trocar o src volta a tentar a imagem depois de uma falha", () => {
    const { rerender } = render(<Avatar name="Lucas Rocha" src="https://exemplo.com/quebrada.png" />);
    fireEvent.error(screen.getByRole("img", { name: "Foto de Lucas Rocha" }));
    expect(screen.getByText("LR")).toBeInTheDocument();

    rerender(<Avatar name="Lucas Rocha" src="https://exemplo.com/nova.png" />);

    expect(screen.getByRole("img", { name: "Foto de Lucas Rocha" })).toHaveAttribute(
      "src",
      "https://exemplo.com/nova.png",
    );
  });
});
