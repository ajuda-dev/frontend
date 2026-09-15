import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openNotificationStream } from "../services/notificationStream";
import { useNotificationStream } from "./useNotificationStream";

vi.mock("../services/notificationStream", () => ({
  openNotificationStream: vi.fn(() => vi.fn()),
}));

const mockedOpen = vi.mocked(openNotificationStream);

describe("useNotificationStream", () => {
  beforeEach(() => {
    mockedOpen.mockReset();
  });

  it("enabled true abre o stream", () => {
    const close = vi.fn();
    mockedOpen.mockReturnValue(close);

    renderHook(() => useNotificationStream({ enabled: true, onNotification: vi.fn() }));

    expect(mockedOpen).toHaveBeenCalledTimes(1);
  });

  it("unmount fecha o stream", () => {
    const close = vi.fn();
    mockedOpen.mockReturnValue(close);

    const { unmount } = renderHook(() =>
      useNotificationStream({ enabled: true, onNotification: vi.fn() }),
    );
    unmount();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("enabled false fecha o stream", () => {
    const close = vi.fn();
    mockedOpen.mockReturnValue(close);

    const { rerender } = renderHook(
      ({ enabled }) => useNotificationStream({ enabled, onNotification: vi.fn() }),
      { initialProps: { enabled: true } },
    );
    rerender({ enabled: false });

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("troca de handlers não reabre o stream", () => {
    const close = vi.fn();
    mockedOpen.mockReturnValue(close);

    const { rerender } = renderHook(
      ({ onNotification }) => useNotificationStream({ enabled: true, onNotification }),
      { initialProps: { onNotification: vi.fn() } },
    );
    rerender({ onNotification: vi.fn() });

    expect(mockedOpen).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });
});
