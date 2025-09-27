import { useState } from 'react';
import { Edge, Node } from 'reactflow';
import { BrainCellMeta, EasyNetLink, IOType } from '../types';

export function useRunner(
  nodes: Node<BrainCellMeta>[],
  edges: Edge<EasyNetLink & { io: IOType }>[],
  setNodes: any,
  log: (s: string) => void,
) {
  const [paused, setPaused] = useState(false);
  const [stepping, setStepping] = useState(false);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  async function runNode(nodeId: string) {
    setNodes((ns: Node<BrainCellMeta>[]) =>
      ns.map(n =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, runtime: { ...n.data.runtime, status: "running" } } }
          : n
      )
    );

    for (let p = 0; p <= 100; p += 20) {
      if (paused && !stepping) {
        await new Promise<void>(resume => {
          const iv = setInterval(() => {
            if (!paused) {
              clearInterval(iv);
              resume();
            }
          }, 50);
        });
      }
      if (stepping) {
        setStepping(false);
      }
      setNodes((ns: Node<BrainCellMeta>[]) =>
        ns.map(n =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, runtime: { ...n.data.runtime, progress: p } } }
            : n
        )
      );
      await sleep(120);
    }

    setNodes((ns: Node<BrainCellMeta>[]) =>
      ns.map(n =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, runtime: { ...n.data.runtime, status: "success" } } }
          : n
      )
    );
  }

  async function runAll() {
    log("开始运行图...");
    for (const n of nodes) {
      if (n.data.runtime.breakpoint) {
        setPaused(true);
        log(`命中断点: ${n.data.name}`);
      }
      await runNode(n.id);
      log(`完成: ${n.data.name}`);
    }
    log("完成运行。");
  }

  function pause() {
    setPaused(true);
    log("暂停");
  }

  function resume() {
    setPaused(false);
    log("继续");
  }

  function singleStep() {
    setStepping(true);
    setPaused(true);
    log("单步");
  }

  function reset() {
    setNodes((ns: Node<BrainCellMeta>[]) =>
      ns.map(n => ({
        ...n,
        data: {
          ...n.data,
          runtime: { ...n.data.runtime, status: "idle" as const, progress: 0, logs: [] }
        }
      }))
    );
    log("重置状态");
  }

  return { runAll, pause, resume, singleStep, reset };
}