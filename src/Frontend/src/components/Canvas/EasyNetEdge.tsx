import { BaseEdge, EdgeLabelRenderer, MarkerType } from "reactflow";

export function EasyNetEdge({ id, sourceX, sourceY, targetX, targetY, selected, data }: any) {
  const path = `M ${sourceX},${sourceY} C ${sourceX + 60},${sourceY} ${targetX - 60},${targetY} ${targetX},${targetY}`;
  const stroke = data?.io === "data" ? "#2563eb" : "#b45309";

  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke, strokeWidth: 2 }} markerEnd={MarkerType.ArrowClosed} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px)`,
            pointerEvents: "all",
          }}
          className={`rounded-full border bg-white/90 backdrop-blur px-2 py-1 text-[10px] shadow ${selected ? "ring-2 ring-rose-400" : ""}`}
        >
          <span className="font-medium">{data?.protocol ?? "topic"}</span>
          <span className="mx-1">/</span>
          <span className="text-gray-600">{data?.channel ?? "channel"}</span>
          {typeof data?.qos !== "undefined" && <span className="ml-1 text-gray-500">qos={data.qos}</span>}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const edgeTypes = { easynet: EasyNetEdge } as const;