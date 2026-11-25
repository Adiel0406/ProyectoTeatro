import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PerformanceSeat } from "./api.ts";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
}

interface SeatPosition {
  code: string;
  rowIndex: number;
  colIndex: number;
  rowLabel: string;
  colNumber: number;
  x: number;
  y: number;
  z: number;
}

const ROW_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
const COLS_PER_ROW = 8;
const STAGE_HEIGHT = 1.05;
const STAGE_WIDTH = 11.4;
const STAGE_DEPTH = 7.8;
const SEAT_COL_SPACING = 1.15;
const SEAT_ROW_SPACING = 1.35;
const FIRST_ROW_Z = 2.65;
const ROW_RAKE_STEP = 0.28;
const EYE_HEIGHT_ABOVE_FLOOR = 1.12;
const NEAR_CLIP = 0.18;

function parseSeatPosition(code: string): SeatPosition {
  const rowLabel = code.charAt(0).toUpperCase();
  const colNumber = Number(code.slice(1)) || 1;
  const rowIndex = Math.max(0, ROW_LETTERS.indexOf(rowLabel as (typeof ROW_LETTERS)[number]));
  const colIndex = Math.min(COLS_PER_ROW - 1, Math.max(0, colNumber - 1));
  const x = (colIndex - (COLS_PER_ROW - 1) / 2) * SEAT_COL_SPACING;
  const floorY = rowIndex * ROW_RAKE_STEP;
  const z = FIRST_ROW_Z + rowIndex * SEAT_ROW_SPACING;
  return {
    code,
    rowIndex,
    colIndex,
    rowLabel,
    colNumber,
    x,
    y: floorY,
    z,
  };
}

function getSightlineDescription(pos: SeatPosition) {
  const distanceMeters = Math.hypot(pos.x, pos.z + 1.2).toFixed(1);
  const zoneLabel =
    pos.rowIndex <= 1 ? "Platea delantera" : pos.rowIndex <= 3 ? "Platea central" : "Platea alta";
  const angleLabel =
    pos.colIndex <= 1
      ? "Ángulo diagonal izquierdo"
      : pos.colIndex >= 6
        ? "Ángulo diagonal derecho"
        : "Vista frontal equilibrada";
  return { distanceMeters, zoneLabel, angleLabel };
}

interface CameraState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  focal: number;
  width: number;
  height: number;
}

function toCameraSpace(point: Point3D, cam: CameraState): Point3D {
  const dx = point.x - cam.x;
  const dy = point.y - cam.y;
  const dz = point.z - cam.z;
  const cosYaw = Math.cos(cam.yaw);
  const sinYaw = Math.sin(cam.yaw);
  const rx = dx * cosYaw + dz * sinYaw;
  const rz = dx * sinYaw - dz * cosYaw;
  const cosPitch = Math.cos(cam.pitch);
  const sinPitch = Math.sin(cam.pitch);
  const cy = dy * cosPitch - rz * sinPitch;
  const cz = dy * sinPitch + rz * cosPitch;
  return { x: rx, y: cy, z: cz };
}

function clipPolygonNear(points: Point3D[]): Point3D[] {
  if (points.length === 0) return [];
  const output: Point3D[] = [];
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const prev = points[(i + points.length - 1) % points.length];
    const currentInside = current.z >= NEAR_CLIP;
    const prevInside = prev.z >= NEAR_CLIP;
    if (currentInside !== prevInside) {
      const t = (NEAR_CLIP - prev.z) / (current.z - prev.z);
      output.push({
        x: prev.x + (current.x - prev.x) * t,
        y: prev.y + (current.y - prev.y) * t,
        z: NEAR_CLIP,
      });
    }
    if (currentInside) {
      output.push(current);
    }
  }
  return output;
}

function projectPoint(camPoint: Point3D, cam: CameraState): ProjectedPoint {
  return {
    x: cam.width * 0.5 + (camPoint.x / camPoint.z) * cam.focal,
    y: cam.height * 0.5 - (camPoint.y / camPoint.z) * cam.focal,
    z: camPoint.z,
  };
}

function drawPolygon3D(
  ctx: CanvasRenderingContext2D,
  worldPoints: Point3D[],
  cam: CameraState,
  fillStyle: string | CanvasGradient,
  strokeStyle?: string,
  lineWidth = 1,
) {
  const camPoints = worldPoints.map((pt) => toCameraSpace(pt, cam));
  const clipped = clipPolygonNear(camPoints);
  if (clipped.length < 3) return;
  const projected = clipped.map((pt) => projectPoint(pt, cam));

  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  for (let i = 1; i < projected.length; i++) {
    ctx.lineTo(projected[i].x, projected[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawLine3D(
  ctx: CanvasRenderingContext2D,
  a: Point3D,
  b: Point3D,
  cam: CameraState,
  strokeStyle: string,
  lineWidth = 1,
) {
  let ca = toCameraSpace(a, cam);
  let cb = toCameraSpace(b, cam);
  if (ca.z < NEAR_CLIP && cb.z < NEAR_CLIP) return;
  if (ca.z < NEAR_CLIP) {
    const t = (NEAR_CLIP - ca.z) / (cb.z - ca.z);
    ca = { x: ca.x + (cb.x - ca.x) * t, y: ca.y + (cb.y - ca.y) * t, z: NEAR_CLIP };
  } else if (cb.z < NEAR_CLIP) {
    const t = (NEAR_CLIP - cb.z) / (ca.z - cb.z);
    cb = { x: cb.x + (ca.x - cb.x) * t, y: cb.y + (ca.y - cb.y) * t, z: NEAR_CLIP };
  }
  const pa = projectPoint(ca, cam);
  const pb = projectPoint(cb, cam);
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawSeat3D(
  ctx: CanvasRenderingContext2D,
  seat: SeatPosition,
  isSelected: boolean,
  isPreferential: boolean,
  isReserved: boolean,
  cam: CameraState,
) {
  const halfW = 0.38;
  const seatTopY = seat.y + 0.44;
  const backTopY = seat.y + 0.94;
  const backZ = seat.z + 0.16;
  const frontZ = seat.z - 0.18;

  const backColor = isSelected
    ? "#d4af37"
    : isReserved
      ? "#3a272b"
      : isPreferential
        ? "#7b1230"
        : "#5c1024";
  const rimColor = isSelected
    ? "#fff0b5"
    : isPreferential
      ? "rgba(232, 194, 82, 0.85)"
      : "rgba(212, 175, 55, 0.35)";

  drawPolygon3D(
    ctx,
    [
      { x: seat.x - halfW, y: seatTopY, z: frontZ },
      { x: seat.x + halfW, y: seatTopY, z: frontZ },
      { x: seat.x + halfW, y: seatTopY, z: backZ },
      { x: seat.x - halfW, y: seatTopY, z: backZ },
    ],
    cam,
    isSelected ? "#b68e22" : "#380b18",
    rimColor,
    1,
  );

  drawPolygon3D(
    ctx,
    [
      { x: seat.x - halfW, y: seat.y + 0.25, z: backZ },
      { x: seat.x + halfW, y: seat.y + 0.25, z: backZ },
      { x: seat.x + halfW * 0.94, y: backTopY, z: backZ + 0.04 },
      { x: seat.x - halfW * 0.94, y: backTopY, z: backZ + 0.04 },
    ],
    cam,
    backColor,
    rimColor,
    isSelected ? 1.8 : 1,
  );

  for (const side of [-1, 1] as const) {
    const armX = seat.x + side * halfW;
    drawLine3D(
      ctx,
      { x: armX, y: seat.y + 0.56, z: frontZ + 0.04 },
      { x: armX, y: seat.y + 0.62, z: backZ },
      cam,
      "rgba(212, 175, 55, 0.45)",
      2,
    );
  }
}

export function StagePreview3D({
  showTitle,
  venue,
  seats,
  selectedSeats,
  initialSeatCode,
  onClose,
}: {
  showTitle: string;
  venue: string;
  seats: PerformanceSeat[];
  selectedSeats: string[];
  initialSeatCode: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSeatCode, setActiveSeatCode] = useState(
    selectedSeats.includes(initialSeatCode) ? initialSeatCode : selectedSeats[0] ?? "C4",
  );

  const seatPos = useMemo(() => parseSeatPosition(activeSeatCode), [activeSeatCode]);
  const activeSeatInfo = useMemo(
    () => seats.find((item) => item.code === activeSeatCode),
    [activeSeatCode, seats],
  );
  const sightline = useMemo(() => getSightlineDescription(seatPos), [seatPos]);

  const defaultLook = useMemo(() => {
    const eyeY = seatPos.y + EYE_HEIGHT_ABOVE_FLOOR;
    const targetX = 0;
    const targetY = STAGE_HEIGHT + 1.35;
    const targetZ = -2.2;
    const dx = targetX - seatPos.x;
    const dy = targetY - eyeY;
    const dz = targetZ - seatPos.z;
    const yaw = Math.atan2(dx, -dz);
    const horizontalDist = Math.hypot(dx, dz);
    const pitch = Math.atan2(dy, horizontalDist);
    return { yaw, pitch };
  }, [seatPos]);

  const lookOffsetRef = useRef({ yaw: 0, pitch: 0 });
  const renderOnceRef = useRef<(() => void) | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    baseYaw: number;
    basePitch: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    baseYaw: 0,
    basePitch: 0,
  });

  const updateLookOffset = useCallback((nextYaw: number, nextPitch: number) => {
    lookOffsetRef.current = {
      yaw: Math.max(-0.95, Math.min(0.95, nextYaw)),
      pitch: Math.max(-0.35, Math.min(0.42, nextPitch)),
    };
    renderOnceRef.current?.();
  }, []);

  useEffect(() => {
    updateLookOffset(0, 0);
  }, [activeSeatCode, updateLookOffset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrameId = 0;
    let width = container.clientWidth || 680;
    let height = container.clientHeight || 420;

    const seatMapByCode = new Map(seats.map((seat) => [seat.code, seat]));

    const drawFrame = (timeMs: number) => {
      const t = prefersReducedMotion ? 0 : timeMs * 0.001;
      const cam: CameraState = {
        x: seatPos.x,
        y: seatPos.y + EYE_HEIGHT_ABOVE_FLOOR,
        z: seatPos.z,
        yaw: defaultLook.yaw + lookOffsetRef.current.yaw,
        pitch: defaultLook.pitch + lookOffsetRef.current.pitch,
        focal: width * 0.76,
        width,
        height,
      };

      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#09080c");
      bgGrad.addColorStop(0.55, "#150e14");
      bgGrad.addColorStop(1, "#0b090c");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const hallHalfW = 7.4;
      const hallCeilY = 6.7;
      const hallBackZ = FIRST_ROW_Z + ROW_LETTERS.length * SEAT_ROW_SPACING + 1.2;

      // Ceiling
      drawPolygon3D(
        ctx,
        [
          { x: -hallHalfW, y: hallCeilY, z: 0.1 },
          { x: hallHalfW, y: hallCeilY, z: 0.1 },
          { x: hallHalfW, y: hallCeilY + 0.4, z: hallBackZ },
          { x: -hallHalfW, y: hallCeilY + 0.4, z: hallBackZ },
        ],
        cam,
        "#0f0c11",
      );

      // Side walls
      drawPolygon3D(
        ctx,
        [
          { x: -hallHalfW, y: 0, z: 0.1 },
          { x: -hallHalfW, y: hallCeilY, z: 0.1 },
          { x: -hallHalfW, y: hallCeilY + 0.4, z: hallBackZ },
          { x: -hallHalfW, y: 1.5, z: hallBackZ },
        ],
        cam,
        "#171015",
        "rgba(212, 175, 55, 0.12)",
      );
      drawPolygon3D(
        ctx,
        [
          { x: hallHalfW, y: 0, z: 0.1 },
          { x: hallHalfW, y: hallCeilY, z: 0.1 },
          { x: hallHalfW, y: hallCeilY + 0.4, z: hallBackZ },
          { x: hallHalfW, y: 1.5, z: hallBackZ },
        ],
        cam,
        "#171015",
        "rgba(212, 175, 55, 0.12)",
      );

      // Wall pilasters & sconces
      for (let z = 1.8; z <= 9.2; z += 2.4) {
        for (const side of [-1, 1] as const) {
          const wx = side * (hallHalfW - 0.05);
          drawLine3D(
            ctx,
            { x: wx, y: 0.2, z },
            { x: wx, y: hallCeilY, z },
            cam,
            "rgba(212, 175, 55, 0.18)",
            1.5,
          );
          const sconce = toCameraSpace({ x: wx * 0.97, y: 3.3, z }, cam);
          if (sconce.z >= NEAR_CLIP) {
            const p = projectPoint(sconce, cam);
            const r = Math.max(3, (0.24 / sconce.z) * cam.focal);
            const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.5);
            glow.addColorStop(0, "rgba(255, 215, 130, 0.85)");
            glow.addColorStop(0.35, "rgba(212, 175, 55, 0.24)");
            glow.addColorStop(1, "rgba(212, 175, 55, 0)");
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r * 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Stage backdrop
      const stageHalfW = STAGE_WIDTH * 0.5;
      drawPolygon3D(
        ctx,
        [
          { x: -stageHalfW, y: STAGE_HEIGHT, z: -STAGE_DEPTH },
          { x: stageHalfW, y: STAGE_HEIGHT, z: -STAGE_DEPTH },
          { x: stageHalfW, y: 6.1, z: -STAGE_DEPTH },
          { x: -stageHalfW, y: 6.1, z: -STAGE_DEPTH },
        ],
        cam,
        "#11182c",
      );

      const stageCenterCam = toCameraSpace(
        { x: 0, y: STAGE_HEIGHT + 2.0, z: -STAGE_DEPTH + 0.2 },
        cam,
      );
      if (stageCenterCam.z >= NEAR_CLIP) {
        const sc = projectPoint(stageCenterCam, cam);
        const haloRadius = Math.max(40, (4.2 / stageCenterCam.z) * cam.focal);
        const backdropGlow = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, haloRadius);
        backdropGlow.addColorStop(0, "rgba(212, 175, 55, 0.26)");
        backdropGlow.addColorStop(0.45, "rgba(46, 73, 153, 0.22)");
        backdropGlow.addColorStop(1, "rgba(17, 24, 44, 0)");
        ctx.fillStyle = backdropGlow;
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, haloRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stage side wings
      drawPolygon3D(
        ctx,
        [
          { x: -stageHalfW, y: STAGE_HEIGHT, z: 0 },
          { x: -stageHalfW, y: 6.1, z: 0 },
          { x: -stageHalfW, y: 6.1, z: -STAGE_DEPTH },
          { x: -stageHalfW, y: STAGE_HEIGHT, z: -STAGE_DEPTH },
        ],
        cam,
        "#120b10",
      );
      drawPolygon3D(
        ctx,
        [
          { x: stageHalfW, y: STAGE_HEIGHT, z: 0 },
          { x: stageHalfW, y: 6.1, z: 0 },
          { x: stageHalfW, y: 6.1, z: -STAGE_DEPTH },
          { x: stageHalfW, y: STAGE_HEIGHT, z: -STAGE_DEPTH },
        ],
        cam,
        "#120b10",
      );

      // Stage wooden deck
      drawPolygon3D(
        ctx,
        [
          { x: -stageHalfW, y: STAGE_HEIGHT, z: 0 },
          { x: stageHalfW, y: STAGE_HEIGHT, z: 0 },
          { x: stageHalfW, y: STAGE_HEIGHT, z: -STAGE_DEPTH },
          { x: -stageHalfW, y: STAGE_HEIGHT, z: -STAGE_DEPTH },
        ],
        cam,
        "#2f1d18",
        "rgba(212, 175, 55, 0.35)",
      );

      for (let px = -5; px <= 5; px += 1) {
        drawLine3D(
          ctx,
          { x: px, y: STAGE_HEIGHT + 0.005, z: 0 },
          { x: px, y: STAGE_HEIGHT + 0.005, z: -STAGE_DEPTH },
          cam,
          "rgba(255, 226, 170, 0.08)",
          1,
        );
      }
      for (let pz = -1; pz >= -7; pz -= 1.2) {
        drawLine3D(
          ctx,
          { x: -stageHalfW, y: STAGE_HEIGHT + 0.005, z: pz },
          { x: stageHalfW, y: STAGE_HEIGHT + 0.005, z: pz },
          cam,
          "rgba(255, 226, 170, 0.06)",
          1,
        );
      }

      // Center stage spotlight pool
      const poolCenter = toCameraSpace({ x: 0, y: STAGE_HEIGHT + 0.01, z: -3.1 }, cam);
      if (poolCenter.z >= NEAR_CLIP) {
        const pp = projectPoint(poolCenter, cam);
        const rx = Math.max(24, (2.2 / poolCenter.z) * cam.focal);
        const ry = rx * 0.28;
        const poolGrad = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, rx);
        poolGrad.addColorStop(0, "rgba(255, 228, 152, 0.42)");
        poolGrad.addColorStop(0.65, "rgba(212, 175, 55, 0.14)");
        poolGrad.addColorStop(1, "rgba(212, 175, 55, 0)");
        ctx.save();
        ctx.translate(pp.x, pp.y);
        ctx.scale(1, ry / rx);
        ctx.fillStyle = poolGrad;
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Scenic columns on stage
      for (const colX of [-3.4, 3.4]) {
        drawPolygon3D(
          ctx,
          [
            { x: colX - 0.22, y: STAGE_HEIGHT, z: -4.8 },
            { x: colX + 0.22, y: STAGE_HEIGHT, z: -4.8 },
            { x: colX + 0.2, y: 5.1, z: -4.8 },
            { x: colX - 0.2, y: 5.1, z: -4.8 },
          ],
          cam,
          "#242840",
          "rgba(212, 175, 55, 0.28)",
        );
      }

      // Volumetric stage spotlight cones
      const sway = Math.sin(t * 0.7) * 0.45;
      for (const beam of [
        { topX: -1.8, bottomX: -0.4 + sway, z: -3.0, color: "rgba(244, 214, 128, 0.11)" },
        { topX: 1.8, bottomX: 0.4 - sway * 0.8, z: -3.4, color: "rgba(120, 165, 255, 0.08)" },
      ]) {
        drawPolygon3D(
          ctx,
          [
            { x: beam.topX - 0.25, y: 5.9, z: beam.z + 0.4 },
            { x: beam.topX + 0.25, y: 5.9, z: beam.z + 0.4 },
            { x: beam.bottomX + 1.35, y: STAGE_HEIGHT, z: beam.z },
            { x: beam.bottomX - 1.35, y: STAGE_HEIGHT, z: beam.z },
          ],
          cam,
          beam.color,
        );
      }

      // Stage front apron & footlights
      drawPolygon3D(
        ctx,
        [
          { x: -stageHalfW, y: 0, z: 0 },
          { x: stageHalfW, y: 0, z: 0 },
          { x: stageHalfW, y: STAGE_HEIGHT, z: 0 },
          { x: -stageHalfW, y: STAGE_HEIGHT, z: 0 },
        ],
        cam,
        "#1f0c12",
        "rgba(212, 175, 55, 0.45)",
      );

      for (let fx = -4.5; fx <= 4.5; fx += 1.5) {
        const fl = toCameraSpace({ x: fx, y: STAGE_HEIGHT + 0.03, z: 0.03 }, cam);
        if (fl.z >= NEAR_CLIP) {
          const fp = projectPoint(fl, cam);
          const fr = Math.max(2.5, (0.14 / fl.z) * cam.focal);
          const fg = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, fr * 2.5);
          fg.addColorStop(0, "rgba(255, 232, 160, 0.9)");
          fg.addColorStop(1, "rgba(212, 175, 55, 0)");
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(fp.x, fp.y, fr * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Proscenium curtains
      const curtainInnerX = 4.65;
      drawPolygon3D(
        ctx,
        [
          { x: -stageHalfW - 0.5, y: STAGE_HEIGHT, z: 0.08 },
          { x: -curtainInnerX, y: STAGE_HEIGHT, z: 0.08 },
          { x: -curtainInnerX + 0.35, y: 5.95, z: 0.08 },
          { x: -stageHalfW - 0.5, y: 5.95, z: 0.08 },
        ],
        cam,
        "#630820",
        "rgba(212, 175, 55, 0.3)",
      );
      drawPolygon3D(
        ctx,
        [
          { x: curtainInnerX, y: STAGE_HEIGHT, z: 0.08 },
          { x: stageHalfW + 0.5, y: STAGE_HEIGHT, z: 0.08 },
          { x: stageHalfW + 0.5, y: 5.95, z: 0.08 },
          { x: curtainInnerX - 0.35, y: 5.95, z: 0.08 },
        ],
        cam,
        "#630820",
        "rgba(212, 175, 55, 0.3)",
      );
      for (const baseX of [-5.5, -5.05, 5.05, 5.5]) {
        drawLine3D(
          ctx,
          { x: baseX, y: STAGE_HEIGHT, z: 0.1 },
          { x: baseX, y: 5.9, z: 0.1 },
          cam,
          "rgba(0, 0, 0, 0.38)",
          2,
        );
      }

      // Top valance & proscenium pillars
      drawPolygon3D(
        ctx,
        [
          { x: -hallHalfW, y: 5.35, z: 0.12 },
          { x: hallHalfW, y: 5.35, z: 0.12 },
          { x: hallHalfW, y: hallCeilY, z: 0.12 },
          { x: -hallHalfW, y: hallCeilY, z: 0.12 },
        ],
        cam,
        "#4d0618",
        "rgba(212, 175, 55, 0.45)",
      );

      const crestPos = toCameraSpace({ x: 0, y: 5.72, z: 0.14 }, cam);
      if (crestPos.z >= NEAR_CLIP) {
        const cp = projectPoint(crestPos, cam);
        const fontSize = Math.max(9, Math.min(20, (0.28 / crestPos.z) * cam.focal));
        ctx.save();
        ctx.fillStyle = "rgba(244, 224, 160, 0.85)";
        ctx.font = `600 ${fontSize}px "Playfair Display", Georgia, serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("TEATRO UCB", cp.x, cp.y);
        ctx.restore();
      }

      drawPolygon3D(
        ctx,
        [
          { x: -hallHalfW, y: 0, z: 0.14 },
          { x: -5.55, y: 0, z: 0.14 },
          { x: -5.55, y: hallCeilY, z: 0.14 },
          { x: -hallHalfW, y: hallCeilY, z: 0.14 },
        ],
        cam,
        "#251419",
        "rgba(212, 175, 55, 0.35)",
      );
      drawPolygon3D(
        ctx,
        [
          { x: 5.55, y: 0, z: 0.14 },
          { x: hallHalfW, y: 0, z: 0.14 },
          { x: hallHalfW, y: hallCeilY, z: 0.14 },
          { x: 5.55, y: hallCeilY, z: 0.14 },
        ],
        cam,
        "#251419",
        "rgba(212, 175, 55, 0.35)",
      );

      // Auditorium floor tiers and seats up to the viewer's row
      for (let r = 0; r <= seatPos.rowIndex; r++) {
        const tierY = r * ROW_RAKE_STEP;
        const prevTierY = Math.max(0, (r - 1) * ROW_RAKE_STEP);
        const tierFrontZ = FIRST_ROW_Z + r * SEAT_ROW_SPACING - 0.65;
        const tierBackZ = tierFrontZ + SEAT_ROW_SPACING;

        if (r > 0) {
          drawPolygon3D(
            ctx,
            [
              { x: -hallHalfW, y: prevTierY, z: tierFrontZ },
              { x: hallHalfW, y: prevTierY, z: tierFrontZ },
              { x: hallHalfW, y: tierY, z: tierFrontZ },
              { x: -hallHalfW, y: tierY, z: tierFrontZ },
            ],
            cam,
            "#120b0f",
            "rgba(212, 175, 55, 0.22)",
          );
        }

        drawPolygon3D(
          ctx,
          [
            { x: -hallHalfW, y: tierY, z: tierFrontZ },
            { x: hallHalfW, y: tierY, z: tierFrontZ },
            { x: hallHalfW, y: tierY, z: tierBackZ },
            { x: -hallHalfW, y: tierY, z: tierBackZ },
          ],
          cam,
          r % 2 === 0 ? "#181014" : "#1c1217",
          "rgba(212, 175, 55, 0.12)",
        );

        const colsOrdered = Array.from({ length: COLS_PER_ROW }, (_, i) => i).sort((a, b) => {
          const ax = Math.abs((a - 3.5) * SEAT_COL_SPACING - cam.x);
          const bx = Math.abs((b - 3.5) * SEAT_COL_SPACING - cam.x);
          return bx - ax;
        });

        for (const c of colsOrdered) {
          if (r === seatPos.rowIndex && c === seatPos.colIndex) continue;
          const code = `${ROW_LETTERS[r]}${c + 1}`;
          const pos = parseSeatPosition(code);
          const apiSeat = seatMapByCode.get(code);
          drawSeat3D(
            ctx,
            pos,
            selectedSeats.includes(code),
            apiSeat?.category === "Preferencial",
            apiSeat?.status === "RESERVED",
            cam,
          );
        }
      }
    };

    const updateSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = container.clientWidth || 680;
      height = container.clientHeight || 420;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFrame(performance.now());
    };

    renderOnceRef.current = () => {
      if (prefersReducedMotion) drawFrame(0);
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    const tick = (timeMs: number) => {
      drawFrame(timeMs);
      animationFrameId = window.requestAnimationFrame(tick);
    };

    if (!prefersReducedMotion) {
      animationFrameId = window.requestAnimationFrame(tick);
    }

    return () => {
      renderOnceRef.current = null;
      resizeObserver.disconnect();
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [defaultLook.pitch, defaultLook.yaw, seatPos, seats, selectedSeats]);

  return (
    <section className="stage-3d" aria-label={`Vista tridimensional desde la butaca ${activeSeatCode}`}>
      <div className="stage-3d__topbar">
        <div>
          <p className="eyebrow"><span className="eyebrow__rule" />Vista desde tu butaca</p>
          <h3 className="stage-3d__title">
            Escenario en 3D · <em>Butaca {activeSeatCode}</em>
          </h3>
          <p className="stage-3d__subtitle">
            {showTitle} · {venue}
          </p>
        </div>
        <button className="button button--outline stage-3d__back" type="button" onClick={onClose}>
          ← Volver a la reserva
        </button>
      </div>

      {selectedSeats.length > 1 && (
        <div className="stage-3d__seats" role="group" aria-label="Cambiar entre tus butacas seleccionadas">
          {selectedSeats.map((code) => (
            <button
              key={code}
              type="button"
              className={`stage-3d__seat-chip${code === activeSeatCode ? " is-active" : ""}`}
              onClick={() => setActiveSeatCode(code)}
            >
              Butaca {code}
            </button>
          ))}
        </div>
      )}

      <div
        className="stage-3d__viewport"
        ref={containerRef}
        tabIndex={0}
        aria-label="Vista interactiva 3D del escenario. Arrastra o usa las flechas del teclado para mirar alrededor."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragStateRef.current = {
            active: true,
            startX: event.clientX,
            startY: event.clientY,
            baseYaw: lookOffsetRef.current.yaw,
            basePitch: lookOffsetRef.current.pitch,
          };
        }}
        onPointerMove={(event) => {
          if (!dragStateRef.current.active) return;
          const dx = event.clientX - dragStateRef.current.startX;
          const dy = event.clientY - dragStateRef.current.startY;
          updateLookOffset(
            dragStateRef.current.baseYaw - dx * 0.0035,
            dragStateRef.current.basePitch + dy * 0.0028,
          );
        }}
        onPointerUp={() => {
          dragStateRef.current.active = false;
        }}
        onPointerCancel={() => {
          dragStateRef.current.active = false;
        }}
        onKeyDown={(event) => {
          const step = 0.08;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            updateLookOffset(lookOffsetRef.current.yaw - step, lookOffsetRef.current.pitch);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            updateLookOffset(lookOffsetRef.current.yaw + step, lookOffsetRef.current.pitch);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            updateLookOffset(lookOffsetRef.current.yaw, lookOffsetRef.current.pitch + step);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            updateLookOffset(lookOffsetRef.current.yaw, lookOffsetRef.current.pitch - step);
          } else if (event.key === "0" || event.key === "Home") {
            event.preventDefault();
            updateLookOffset(0, 0);
          }
        }}
      >
        <canvas ref={canvasRef} className="stage-3d__canvas" />
        <div className="stage-3d__hud-top">
          <span className="stage-3d__badge">
            Fila {seatPos.rowLabel} · Asiento {seatPos.colNumber}
            {activeSeatInfo ? ` · ${activeSeatInfo.category}` : ""}
          </span>
          <span className="stage-3d__badge">~{sightline.distanceMeters} m del escenario</span>
        </div>
        <div className="stage-3d__hud-bottom">
          <span>{sightline.zoneLabel} · {sightline.angleLabel}</span>
          <span>Arrastra para mirar alrededor</span>
        </div>
      </div>

      <div className="stage-3d__controls">
        <button
          className="button button--outline"
          type="button"
          onClick={() => updateLookOffset(lookOffsetRef.current.yaw - 0.22, lookOffsetRef.current.pitch)}
        >
          ← Mirar izquierda
        </button>
        <button
          className="button button--outline"
          type="button"
          onClick={() => updateLookOffset(0, 0)}
        >
          Centrar escenario
        </button>
        <button
          className="button button--outline"
          type="button"
          onClick={() => updateLookOffset(lookOffsetRef.current.yaw + 0.22, lookOffsetRef.current.pitch)}
        >
          Mirar derecha →
        </button>
      </div>
    </section>
  );
}
