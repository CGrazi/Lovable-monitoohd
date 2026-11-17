import { describe, expect, it } from "vitest";
import { countByStatus } from "@/lib/tickets";

describe("countByStatus", () => {
  it("conta chamados por status", () => {
    expect(countByStatus([{ status: "aberto" }, { status: "aberto" }, { status: "resolvido" }])).toEqual({
      aberto: 2, em_atendimento: 0, resolvido: 1,
    });
  });
});
