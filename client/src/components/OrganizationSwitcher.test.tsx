// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const switchOrganization = vi.fn();
vi.mock("@/contexts/OrganizationContext", () => ({ useOrganization: () => ({ activeOrganizationId: 1, setActiveOrganizationId: switchOrganization, organizations: [{ organization: { id: 1, name: "Org Um" }, membership: { role: "admin" } }, { organization: { id: 2, name: "Org Dois" }, membership: { role: "manager" } }] }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/", vi.fn()] }));

import { OrganizationSwitcher } from "./OrganizationSwitcher";

describe("seletor de organização", () => {
  it("troca o ambiente ao selecionar outra organização", async () => {
    const user = userEvent.setup();
    render(<OrganizationSwitcher />);
    const target = screen.getAllByText("Org Dois").find(element => element.closest("button"))?.closest("button");
    expect(target).toBeTruthy();
    await user.click(target!);
    expect(switchOrganization).toHaveBeenCalledWith(2);
  });
});
