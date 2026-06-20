"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ConstellationChart — GiftMind signature visualization.
 *
 * The constellation is the AI's understanding of a person.
 * Every node is a real signal. Every connection is a reasoning thread.
 * When the core ignites, GiftMind's recommendation engine has spoken.
 *
 * Props (unchanged from original API):
 *   dataPoints: Array<{
 *     label: string
 *     category: 'social' | 'wallet' | 'relationship'
 *     importance: number  // 0-1
 *     desc?: string       // optional signal description for tooltip
 *   }>
 *   centerLabel?: string
 */

const CATEGORIES = {
  social: {
    color: "#818CF8",
    glow: "#4F46E5",
    label: "Social Signal",
    dim: "rgba(129,140,248,0.15)",
  },
  wallet: {
    color: "#34D399",
    glow: "#059669",
    label: "Wallet Signal",
    dim: "rgba(52,211,153,0.15)",
  },
  relationship: {
    color: "#F59E0B",
    glow: "#D97706",
    label: "Relationship Signal",
    dim: "rgba(245,158,11,0.15)",
  },
};

// Natural constellation offsets — visually distinct from a circle
const NATURAL_OFFSETS = [
  [-165, -95],
  [40, -145],
  [175, -70],
  [-200, 20],
  [210, 40],
  [-140, 120],
  [10, 160],
  [165, 115],
  [-30, -185],
  [-100, 175],
  [220, -30],
  [-190, -60],
];

function generateOffsets(count) {
  if (count <= NATURAL_OFFSETS.length) return NATURAL_OFFSETS.slice(0, count);
  const extras = [];
  for (let i = NATURAL_OFFSETS.length; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.PI * 0.17;
    const r = 130 + ((i * 37) % 70);
    extras.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  return [...NATURAL_OFFSETS, ...extras];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function ConstellationChart({
  dataPoints = [],
  centerLabel,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const startRef = useRef(Date.now());
  const mouseRef = useRef({ x: 0, y: 0 });
  const parallaxRef = useRef({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [phaseLabel, setPhaseLabel] = useState("Reading the chart…");
  const [showPhase, setShowPhase] = useState(true);
  const [recVisible, setRecVisible] = useState(false);

  const phaseLabelRef = useRef(phaseLabel);
  const showPhaseRef = useRef(showPhase);
  const recVisibleRef = useRef(recVisible);

  // Build node data once
  const nodes = useRef([]);
  useEffect(() => {
    const offsets = generateOffsets(dataPoints.length);
    nodes.current = dataPoints.map((dp, i) => ({
      ...dp,
      cat: CATEGORIES[dp.category] || CATEGORIES.social,
      ox: offsets[i][0],
      oy: offsets[i][1],
      r: 4 + (dp.importance || 0.5) * 9,
      glow: (dp.importance || 0.5) * 28,
      flowOffset: Math.random() * Math.PI * 2,
      twinkle: Math.random() * Math.PI * 2,
      phase: 0,
    }));
    startRef.current = Date.now();
    setShowPhase(true);
    setRecVisible(false);
  }, [dataPoints]);

  // Stars — stable across renders
  const stars = useRef(
    Array.from({ length: 300 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2,
      a: Math.random() * 0.55 + 0.1,
      speed: Math.random() * 0.8 + 0.3,
      phase: Math.random() * Math.PI * 2,
    }))
  );

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const W = canvas.width;
    const H = canvas.height;
    mouseRef.current = {
      x: e.clientX - rect.left - W / 2,
      y: e.clientY - rect.top - H / 2,
    };

    // Hovered node detection
    const px = parallaxRef.current.x * 0.025;
    const py = parallaxRef.current.y * 0.025;
    const cx = W / 2;
    const cy = H / 2;
    let found = null;
    for (const n of nodes.current) {
      if (n.phase < 0.8) continue;
      const nx = cx + n.ox + px;
      const ny = cy + n.oy + py;
      const dx = e.clientX - rect.left - nx;
      const dy = e.clientY - rect.top - ny;
      if (Math.sqrt(dx * dx + dy * dy) < n.r + 14) {
        found = n;
        break;
      }
    }
    setHoveredNode(found);
    if (found) {
      setTooltipPos({ x: e.clientX + 18, y: e.clientY - 22 });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const phaseMessages = [
      "Reading the chart…",
      "Mapping signals…",
      "Activating connections…",
      "Channeling energy…",
      "AI core igniting…",
      "Recommendation forming…",
    ];
    let currentPhaseIdx = -1;

    function setPhase(idx) {
      if (idx === currentPhaseIdx) return;
      currentPhaseIdx = idx;
      if (idx < phaseMessages.length) {
        setPhaseLabel(phaseMessages[idx]);
        setShowPhase(true);
      } else {
        setShowPhase(false);
        setRecVisible(true);
      }
    }

    function drawGlow(cx, cy, r, colorStart, colorEnd, alpha) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, colorStart);
      g.addColorStop(1, colorEnd || "transparent");
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    function frame() {
      const W = canvas.width;
      const H = canvas.height;
      const CX = W / 2;
      const CY = H / 2;
      const elapsed = (Date.now() - startRef.current) / 1000;

      // Smooth parallax
      parallaxRef.current.x = lerp(parallaxRef.current.x, mouseRef.current.x, 0.04);
      parallaxRef.current.y = lerp(parallaxRef.current.y, mouseRef.current.y, 0.04);
      const px = parallaxRef.current.x * 0.025;
      const py = parallaxRef.current.y * 0.025;
      const npx = CX + px;
      const npy = CY + py;

      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#070714";
      ctx.fillRect(0, 0, W, H);

      // Nebula glows
      const nebulae = [
        { ox: -80, oy: -60, r: 320, color: "rgba(79,70,229,0.09)", pm: 2 },
        { ox: 100, oy: 80, r: 280, color: "rgba(16,185,129,0.06)", pm: 1.5 },
        { ox: 0, oy: -100, r: 200, color: "rgba(245,158,11,0.05)", pm: 0.8 },
      ];
      nebulae.forEach(({ ox, oy, r, color, pm }) => {
        const g = ctx.createRadialGradient(
          CX + ox + px * pm, CY + oy + py * pm, 0,
          CX + ox, CY + oy, r
        );
        g.addColorStop(0, color);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      });

      // Starfield
      for (const s of stars.current) {
        const tw = Math.sin(elapsed * s.speed + s.phase) * 0.3 + 0.7;
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x * W + px * 0.1, s.y * H + py * 0.1, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Phase timing
      if (elapsed < 1) setPhase(0);
      else if (elapsed < 3) setPhase(1);
      else if (elapsed < 5) setPhase(2);
      else if (elapsed < 6.5) setPhase(3);
      else if (elapsed < 8) setPhase(4);
      else if (elapsed < 9.5) setPhase(5);
      else setPhase(6);

      // Node animation phase
      nodes.current.forEach((n, i) => {
        const delay = 0.5 + i * 0.22;
        n.phase = clamp((elapsed - delay) / 0.6, 0, 1);
      });

      const linePhase = clamp((elapsed - 2.2) / 2.0, 0, 1);
      const sigPhase = clamp((elapsed - 4.2) / 1.5, 0, 1);
      const corePhase = easeInOut(clamp((elapsed - 7) / 1.5, 0, 1));
      const recPhase = easeOut(clamp((elapsed - 8.8) / 1.2, 0, 1));

      // ── Connection lines ──
      nodes.current.forEach((n, i) => {
        const np = n.phase;
        if (np < 0.01) return;
        const lp = easeOut(clamp(linePhase - i * 0.03, 0, 1));
        if (lp < 0.01) return;

        const nx = CX + n.ox + px;
        const ny = CY + n.oy + py;

        ctx.globalAlpha = np * lp * 0.35;
        ctx.strokeStyle = n.cat.color;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(npx, npy);
        ctx.stroke();

        // Flow particles
        if (sigPhase > 0.05) {
          for (let p = 0; p < 3; p++) {
            const prog = ((elapsed * 0.5 + n.flowOffset + p / 3) % 1);
            const fx = lerp(nx, npx, prog);
            const fy = lerp(ny, npy, prog);
            const fa = Math.sin(prog * Math.PI) * sigPhase * np * 0.85;
            const pg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 4);
            pg.addColorStop(0, n.cat.color);
            pg.addColorStop(1, "transparent");
            ctx.globalAlpha = fa;
            ctx.fillStyle = pg;
            ctx.beginPath();
            ctx.arc(fx, fy, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // ── Data point nodes ──
      nodes.current.forEach((n) => {
        const np = easeOut(n.phase);
        if (np < 0.01) return;
        const nx = CX + n.ox + px;
        const ny = CY + n.oy + py;
        const isHovered = n === nodes.current.find((x) => x.label === n.label && false); // resolved via state
        const tw = Math.sin(elapsed * 1.1 + n.twinkle) * 0.15 + 0.85;
        const r = n.r * np * tw;
        const glowR = n.glow * np;

        // Outer glow
        const og = ctx.createRadialGradient(nx, ny, 0, nx, ny, glowR);
        og.addColorStop(0, n.cat.color + "55");
        og.addColorStop(1, "transparent");
        ctx.globalAlpha = sigPhase * np * 0.7;
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(nx, ny, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Core dot gradient
        ctx.globalAlpha = np;
        const cg = ctx.createRadialGradient(nx - r * 0.3, ny - r * 0.3, 0, nx, ny, r);
        cg.addColorStop(0, "#ffffff");
        cg.addColorStop(0.4, n.cat.color);
        cg.addColorStop(1, n.cat.glow);
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fill();

        // Label
        if (np > 0.6) {
          const dx = nx - CX;
          const dy = ny - CY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const lx = nx + (dx / dist) * (r + 14);
          const ly = ny + (dy / dist) * (r + 14);
          ctx.globalAlpha = np * 0.75;
          ctx.fillStyle = n.cat.color;
          ctx.font = "400 10px system-ui, sans-serif";
          ctx.textAlign = lx < CX ? "right" : "start";
          ctx.textBaseline = "middle";
          ctx.fillText(n.label, lx, ly);
        }
        ctx.globalAlpha = 1;
      });

      // ── Central AI Star ──
      if (corePhase > 0.01) {
        const pulse = Math.sin(elapsed * 2.2) * 0.12 + 1;
        const breathe = Math.sin(elapsed * 0.8) * 0.08 + 1;

        // Energy field
        drawGlow(
          npx, npy,
          90 * corePhase * breathe,
          `rgba(129,140,248,${0.15 * corePhase})`,
          "transparent",
          1
        );

        // Rotating energy rings
        [
          { r: 28, speed: 0.4,  color: "#818CF8", dir: 1 },
          { r: 42, speed: 0.65, color: "#34D399", dir: -1 },
          { r: 56, speed: 0.9,  color: "#F59E0B", dir: 1 },
        ].forEach(({ r, speed, color, dir }, i) => {
          const rr = r * corePhase;
          const rot = elapsed * speed * dir;
          ctx.save();
          ctx.translate(npx, npy);
          ctx.rotate(rot);
          ctx.globalAlpha = (0.3 - i * 0.07) * corePhase;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, rr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });
        ctx.setLineDash([]);

        // Glow layers
        [
          [60 * corePhase * pulse, "rgba(79,70,229,0.18)"],
          [38 * corePhase * pulse, "rgba(129,140,248,0.35)"],
          [22 * corePhase * pulse, "rgba(199,210,254,0.6)"],
          [13 * corePhase * pulse, "rgba(255,255,255,0.9)"],
        ].forEach(([r, color]) => {
          const g = ctx.createRadialGradient(npx, npy, 0, npx, npy, r);
          g.addColorStop(0, "#ffffff");
          g.addColorStop(0.3, color);
          g.addColorStop(1, "transparent");
          ctx.globalAlpha = corePhase;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(npx, npy, r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Particle halo
        if (corePhase > 0.5) {
          for (let p = 0; p < 12; p++) {
            const angle = (p / 12) * Math.PI * 2 + elapsed * 0.3;
            const dist = 18 + Math.sin(elapsed * 2 + p) * 6;
            const ppx = npx + Math.cos(angle) * dist * corePhase;
            const ppy = npy + Math.sin(angle) * dist * corePhase;
            ctx.globalAlpha = (0.4 + Math.sin(elapsed * 3 + p) * 0.3) * corePhase;
            ctx.fillStyle = "#c7d2fe";
            ctx.beginPath();
            ctx.arc(ppx, ppy, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 4-point star spikes
        if (corePhase > 0.3) {
          ctx.save();
          ctx.translate(npx, npy);
          ctx.rotate(elapsed * 0.15);
          ctx.globalAlpha = 0.7 * corePhase;
          for (let sp = 0; sp < 4; sp++) {
            ctx.rotate(Math.PI / 2);
            ctx.save();
            ctx.scale(1, 0.18);
            const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 42 * corePhase);
            sg.addColorStop(0, "rgba(255,255,255,0.9)");
            sg.addColorStop(1, "transparent");
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(0, 0, 42 * corePhase, -Math.PI / 2, Math.PI / 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }

        ctx.globalAlpha = 1;

        // Center label text
        if (centerLabel && recPhase > 0.1) {
          ctx.globalAlpha = recPhase;
          ctx.fillStyle = "#ffffff";
          ctx.font = "500 13px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.shadowColor = "#818CF8";
          ctx.shadowBlur = 14;
          ctx.fillText(centerLabel, npx, npy + 34);
          ctx.shadowBlur = 0;
          ctx.font = "400 10px system-ui, sans-serif";
          ctx.fillStyle = "rgba(199,210,254,0.7)";
          ctx.fillText("Recommendation Ready", npx, npy + 51);
          ctx.globalAlpha = 1;
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dataPoints]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => ro.disconnect();
  }, []);

  const currentHovered = dataPoints.find((dp) => dp === hoveredNode);
  const hovCat = hoveredNode ? CATEGORIES[hoveredNode.category] || CATEGORIES.social : null;

  return (
    <div
      role="img"
      aria-label="GiftMind recipient signal constellation"
      style={{ position: "relative", width: "100%", height: "100%", minHeight: 320 }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        style={{ display: "block", width: "100%", height: "100%", cursor: hoveredNode ? "pointer" : "default" }}
      />

      {/* Phase label */}
      <AnimatePresence>
        {showPhase && (
          <motion.div
            key={phaseLabel}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35 }}
            style={{
              position: "absolute",
              bottom: 18,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(199,210,254,0.45)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {phaseLabel}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredNode && hovCat && (
          <motion.div
            key={hoveredNode.label}
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              left: tooltipPos.x,
              top: tooltipPos.y,
              pointerEvents: "none",
              zIndex: 50,
              background: "rgba(7,7,20,0.92)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "10px 14px",
              minWidth: 180,
              maxWidth: 240,
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 3 }}>
              {hoveredNode.label}
            </div>
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: hovCat.color,
                marginBottom: 7,
              }}
            >
              {hovCat.label}
            </div>
            {hoveredNode.desc && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                {hoveredNode.desc}
              </div>
            )}
            <div
              style={{
                marginTop: 8,
                height: 3,
                borderRadius: 2,
                background: `linear-gradient(90deg, ${hovCat.color}, ${hovCat.glow})`,
                width: `${(hoveredNode.importance || 0.5) * 100}%`,
              }}
            />
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
              Signal strength: {Math.round((hoveredNode.importance || 0.5) * 100)}%
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: cat.color,
                boxShadow: `0 0 6px ${cat.color}`,
              }}
            />
            {cat.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   DEMO / USAGE
   Remove everything below this line when using in your project.
──────────────────────────────────────────────────────────────── */

const DEMO_DATAPOINTS = [
  { label: "Spotify Wrapped",  category: "social",       importance: 0.9,  desc: "Top artist: Kendrick Lamar. 48k listens/yr. Strong indie/hip-hop affinity." },
  { label: "Twitter/X Likes", category: "social",       importance: 0.6,  desc: "Engages heavily with tech, design & sneaker culture threads." },
  { label: "Instagram Tags",  category: "social",       importance: 0.5,  desc: "Tagged in travel & food photography. Prefers experience gifts." },
  { label: "NFT Holdings",    category: "wallet",       importance: 0.85, desc: "Holds 3 art NFTs from MadLabs. Values rare digital collectibles." },
  { label: "DeFi Activity",   category: "wallet",       importance: 0.7,  desc: "14 swaps last 30 days. High crypto-native engagement score." },
  { label: "SOL Transfers",   category: "wallet",       importance: 0.55, desc: "Gifted SOL to 2 addresses on birthdays. Gift-giver pattern detected." },
  { label: "Close Friend",    category: "relationship", importance: 1.0,  desc: "Highest relationship tier. 5yr connection. 92% gift alignment score." },
  { label: "Shared Moments",  category: "relationship", importance: 0.8,  desc: "34 shared photos this year. Strong experiential bond." },
  { label: "Past Gifts",      category: "relationship", importance: 0.75, desc: "Received 4 gifts. Avg ★4.6 satisfaction. Prefers tech & experiences." },
];

export function ConstellationDemo() {
  return (
    <div style={{ width: "100%", height: "100vh", background: "#070714" }}>
      <ConstellationChart
        dataPoints={DEMO_DATAPOINTS}
        centerLabel="GiftMind"
      />
    </div>
  );
}