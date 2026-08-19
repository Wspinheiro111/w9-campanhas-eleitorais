// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ savePdf: vi.fn(), qrCode: vi.fn().mockResolvedValue("data:image/png;base64,qr"), invalidate: vi.fn(), updateProfile: vi.fn(), updateTask: vi.fn(), completeTraining: vi.fn() }));
vi.mock("wouter", () => ({ useRoute: () => [true, { token: "x".repeat(32) }] }));
vi.mock("qrcode", () => ({ default: { toDataURL: mocks.qrCode } }));
vi.mock("jspdf", () => ({ jsPDF: class { setFillColor() {} rect() {} setDrawColor() {} setLineWidth() {} setTextColor() {} setFont() {} setFontSize() {} text() {} addImage() {} line() {} save = mocks.savePdf; } }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ volunteers: { portal: { invalidate: mocks.invalidate } } }), volunteers: { portal: { useQuery: () => ({ isLoading: false, data: { volunteer: { name: "Ana Voluntária", neighborhood: null, region: null, availability: null, skills: null, trainingStatus: "completed", status: "active" }, assignments: [], trainingMaterials: [{ id: 1, title: "Conduta", description: null, materialType: "guide", resourceUrl: null, content: null, durationMinutes: 10, completedAt: new Date("2026-08-19T12:00:00Z") }], certificate: { certificateCode: "W9-V2", issuedAt: new Date("2026-08-20T12:00:00Z"), completedMaterials: 3 }, certificateHistory: [{ certificateCode: "W9-V2", issuedAt: new Date("2026-08-20T12:00:00Z"), completedMaterials: 3, versionNumber: 2 }, { certificateCode: "W9-V1", issuedAt: new Date("2026-08-19T12:00:00Z"), completedMaterials: 2, versionNumber: 1 }], certificateSettings: { primaryColor: "#103527", accentColor: "#c9a85b", logoUrl: null, signatureName: null, signatureRole: null } } }) }, updatePortalProfile: { useMutation: () => ({ mutate: mocks.updateProfile, isPending: false }) }, updateOwnAssignmentStatus: { useMutation: () => ({ mutate: mocks.updateTask, isPending: false }) }, completeTrainingMaterial: { useMutation: () => ({ mutate: mocks.completeTraining, isPending: false }) } } } }));

import VolunteerPortal from "./VolunteerPortal";

describe("histórico privado de certificados", () => {
  afterEach(() => { cleanup(); mocks.savePdf.mockReset(); });

  it("exporta em PDF uma versão anterior sem substituir o certificado atual", async () => {
    render(<VolunteerPortal />);
    const downloads = screen.getAllByRole("button", { name: "Baixar PDF" });
    expect(downloads).toHaveLength(2);
    fireEvent.click(downloads[1]);
    await waitFor(() => expect(mocks.savePdf).toHaveBeenCalledWith("certificado-W9-V1.pdf"));
  });
});
