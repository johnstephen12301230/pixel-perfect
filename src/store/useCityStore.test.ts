import { beforeEach, describe, expect, it } from "vitest";
import { useCityStore } from "./useCityStore";

beforeEach(() => useCityStore.setState(useCityStore.getInitialState(), true));
describe("Phase 2 selection transitions", () => {
  it("selection starts focus before inspection", () => {
    useCityStore.getState().selectProject("commerce-hq");
    expect(useCityStore.getState().interaction).toBe("focusing-building");
    useCityStore.getState().completeCameraTransition(useCityStore.getState().cameraResetToken);
    expect(useCityStore.getState().interaction).toBe("inspecting-building");
  });
  it("Back to City clears both selections and completes the return", () => {
    useCityStore.getState().selectProject("commerce-hq");
    useCityStore.getState().selectProject(null);
    expect(useCityStore.getState().interaction).toBe("returning-to-city");
    expect(useCityStore.getState().selectedProjectId).toBeNull();
    expect(useCityStore.getState().selectedSlotId).toBeNull();
    useCityStore.getState().completeCameraTransition(useCityStore.getState().cameraResetToken);
    expect(useCityStore.getState().interaction).toBe("city-overview");
  });
  it("stale focus cannot finish a newer selection", () => {
    useCityStore.getState().selectProject("commerce-hq");
    const oldToken = useCityStore.getState().cameraResetToken;
    useCityStore.getState().selectProject("analytics-tower");
    useCityStore.getState().completeCameraTransition(oldToken);
    expect(useCityStore.getState().selectedProjectId).toBe("analytics-tower");
    expect(useCityStore.getState().interaction).toBe("focusing-building");
  });
  it("sidebar overview cancels focus", () => {
    useCityStore.getState().selectProject("cloud-operations");
    useCityStore.getState().resetCity();
    expect(useCityStore.getState().selectedProjectId).toBeNull();
    expect(useCityStore.getState().interaction).toBe("returning-to-city");
  });
  it("Build clears project selection without leaving its panel open", () => {
    useCityStore.getState().selectProject("commerce-hq");
    useCityStore.getState().selectSlot("lot-a-s2");
    expect(useCityStore.getState().selectedProjectId).toBeNull();
    expect(useCityStore.getState().selectedSlotId).toBe("lot-a-s2");
  });
});