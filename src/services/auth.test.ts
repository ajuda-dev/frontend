import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import {
  changePassword,
  forgotPassword,
  githubLoginUrl,
  resetPassword,
  resendVerification,
  verifyEmail,
} from "./auth";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockedPost = vi.mocked(api.post);

describe("githubLoginUrl", () => {
  // Sem VITE_API_BASE_URL a navegação sai no mesmo host (proxy do Vite em dev),
  // que é o que mantém os cookies do OAuth (state e sessão) no domínio certo.
  it("aponta para o início do OAuth na base da API", () => {
    expect(githubLoginUrl()).toBe("/v1/auth/github/login");
  });
});

describe("forgotPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /user/forgot-password com o e-mail", async () => {
    mockedPost.mockResolvedValue({ status: 204, data: "" });

    await forgotPassword("lucas@ajudadev.dev");

    expect(mockedPost).toHaveBeenCalledWith("/user/forgot-password", { email: "lucas@ajudadev.dev" });
  });
});

describe("resetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /user/reset-password e normaliza o código para maiúsculas", async () => {
    mockedPost.mockResolvedValue({ status: 204, data: "" });

    await resetPassword({
      email: "lucas@ajudadev.dev",
      code: "ab12cd",
      newPassword: "nova-senha",
    });

    expect(mockedPost).toHaveBeenCalledWith("/user/reset-password", {
      email: "lucas@ajudadev.dev",
      code: "AB12CD",
      newPassword: "nova-senha",
    });
  });
});

describe("changePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /user/change-password com senha atual e nova", async () => {
    mockedPost.mockResolvedValue({ status: 204, data: "" });

    await changePassword({ currentPassword: "antiga123", newPassword: "nova456" });

    expect(mockedPost).toHaveBeenCalledWith("/user/change-password", {
      currentPassword: "antiga123",
      newPassword: "nova456",
    });
  });
});

describe("verifyEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /user/verify-email e normaliza o código para maiúsculas", async () => {
    mockedPost.mockResolvedValue({
      status: 200,
      data: {
        id: "u1",
        name: "Lucas Rocha",
        email: "lucas@ajudadev.dev",
        role: "USER",
        emailVerified: true,
      },
    });

    const result = await verifyEmail("ab12cd");

    expect(mockedPost).toHaveBeenCalledWith("/user/verify-email", { code: "AB12CD" });
    expect(result.emailVerified).toBe(true);
  });
});

describe("resendVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /user/resend-verification sem body", async () => {
    mockedPost.mockResolvedValue({ status: 204, data: "" });

    await resendVerification();

    expect(mockedPost).toHaveBeenCalledWith("/user/resend-verification");
  });
});
