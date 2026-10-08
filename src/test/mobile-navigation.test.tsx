import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";
import { MobileNavigation } from "@/components/awwab/MobileNavigation";
import { setLang } from "@/lib/awwab/i18n";

afterEach(cleanup);

async function openNavigation(path = "/home") {
  setLang("id");
  const root = createRootRoute({ component: () => <><Outlet /><MobileNavigation /></> });
  const routes = ["/home", "/daily", "/calendar", "/monthly", "/goals", "/planner", "/routines", "/weekly", "/insights", "/review", "/settings"].map((path) => createRoute({ getParentRoute: () => root, path, component: () => <div>Page</div> }));
  const router = createRouter({ routeTree: root.addChildren(routes), history: createMemoryHistory({ initialEntries: [path] }) });
  render(<RouterProvider router={router} />);
  await screen.findByRole("button", { name: "Lainnya" });
  return router;
}

describe("Mobile navigation", () => {
  it("shows only the requested primary destinations in order", async () => {
    await openNavigation();
    const nav = screen.getByRole("navigation", { name: "Navigasi utama" });
    expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual(["Beranda", "Harian", "Kalender", "Bulanan", "Tujuan"]);
    expect(screen.queryByRole("link", { name: "Planner" })).not.toBeInTheDocument();
  });

  it("opens remaining features, follows a destination, and closes the menu", async () => {
    const router = await openNavigation();
    fireEvent.click(screen.getByRole("button", { name: "Lainnya" }));
    const more = await screen.findByRole("navigation", { name: "Lainnya" });
    expect(within(more).getAllByRole("link").map((link) => link.textContent)).toEqual(["Planner", "Rutinitas", "Mingguan", "Wawasan", "Review", "Pengaturan"]);
    fireEvent.click(within(more).getByRole("link", { name: "Planner" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/planner"));
    await waitFor(() => expect(screen.queryByRole("navigation", { name: "Lainnya" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Lainnya" })).toHaveClass("text-foreground");
  });

  it("dismisses on Escape and translates the menu", async () => {
    await openNavigation();
    fireEvent.click(screen.getByRole("button", { name: "Lainnya" }));
    await screen.findByRole("navigation", { name: "Lainnya" });
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("navigation", { name: "Lainnya" })).not.toBeInTheDocument());
    setLang("en");
    await screen.findByRole("button", { name: "More" });
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toHaveTextContent("Calendar");
    setLang("id");
  });
});