import { Connection } from "reactflow";
import { GraphSchema } from './types';
import { defaultCell } from './utils';
import { isConnectionAllowed, validateGraph } from './validation';

export const __TEST__ = {
  makeSampleGraph(): GraphSchema {
    const s = defaultCell("Sensor");
    const p = defaultCell("Processor");
    const a = defaultCell("Actuator");
    const nodes: any = [
      { id: "sensor1", type: "braincell", position: { x: 0, y: 0 }, data: s },
      { id: "proc1", type: "braincell", position: { x: 0, y: 0 }, data: p },
      { id: "act1", type: "braincell", position: { x: 0, y: 0 }, data: a },
    ];
    const edges: any = [
      { id: "e1", source: "sensor1", target: "proc1" },
      { id: "e2", source: "proc1", target: "act1" },
    ];
    return { version: "test", nodes, edges } as any;
  },

  test_isConnectionAllowed_mismatch(): boolean {
    const g = this.makeSampleGraph();
    const conn: Connection = { source: "sensor1", sourceHandle: "out", target: "act1", targetHandle: "do" };
    // out is data, do is control -> must be false
    const r = isConnectionAllowed(conn, g.nodes as any);
    return r.ok === false;
  },

  test_validateGraph_simple(): boolean {
    const g = this.makeSampleGraph();
    const res = validateGraph(g.nodes as any, g.edges as any);
    return res.sensors === 1 && res.actuatorHits === 1;
  },
};

/*
Example Vitest:

import { describe, it, expect } from "vitest";
import { __TEST__ } from "./testUtils";

describe("graph basics", () => {
  it("blocks mismatched IO connections", () => {
    expect(__TEST__.test_isConnectionAllowed_mismatch()).toBe(true);
  });
  it("reports connectivity from sensor to actuator", () => {
    expect(__TEST__.test_validateGraph_simple()).toBe(true);
  });
});
*/