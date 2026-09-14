import { describe, expect, it } from "vitest";
import { complementaryRole, isEventApproved } from "./events";

describe("isEventApproved", () => {
  it("trata status ausente como aprovado", () => {
    expect(isEventApproved({})).toBe(true);
  });

  it("trata status vazio como aprovado (linha anterior ao plano 27 do backend)", () => {
    expect(isEventApproved({ status: "" as never })).toBe(true);
  });

  it("trata APPROVED como aprovado", () => {
    expect(isEventApproved({ status: "APPROVED" })).toBe(true);
  });

  it("bloqueia PENDING e REJECTED", () => {
    expect(isEventApproved({ status: "PENDING" })).toBe(false);
    expect(isEventApproved({ status: "REJECTED" })).toBe(false);
  });
});

describe("complementaryRole", () => {
  it("devolve o papel oposto ao de quem criou", () => {
    expect(complementaryRole("MENTOR")).toBe("MENTEE");
    expect(complementaryRole("MENTEE")).toBe("MENTOR");
  });
});
