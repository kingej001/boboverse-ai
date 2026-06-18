import { motion } from "framer-motion";

/**
 * The signature visual element of GiftMind: a constellation that draws
 * itself from the recipient's actual data points (on-chain + social signals)
 * and converges on a central "recommendation star". This is the visual
 * embodiment of "reading a recipient's chart" — not decorative space dressing,
 * the points plotted are the real signals driving the recommendation.
 */
export default function ConstellationChart({ dataPoints = [], centerLabel }) {
  const width = 480;
  const height = 320;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 120;

  const points = dataPoints.map((point, i) => {
    const angle = (i / dataPoints.length) * Math.PI * 2 - Math.PI / 2;
    return {
      ...point,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Recipient data constellation">
      {/* connecting lines from each data point to the center */}
      {points.map((point, i) => (
        <motion.line
          key={`line-${i}`}
          x1={point.x}
          y1={point.y}
          x2={centerX}
          y2={centerY}
          stroke="#5B4B8A"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }}
        />
      ))}

      {/* data point stars */}
      {points.map((point, i) => (
        <g key={`point-${i}`}>
          <motion.circle
            cx={point.x}
            cy={point.y}
            r="5"
            fill="#F2A93B"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.15 }}
          />
          <motion.text
            x={point.x}
            y={point.y > centerY ? point.y + 20 : point.y - 14}
            textAnchor="middle"
            className="fill-starlightDim font-mono"
            fontSize="10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.15 + 0.2 }}
          >
            {point.label}
          </motion.text>
        </g>
      ))}

      {/* central recommendation star */}
      <motion.circle
        cx={centerX}
        cy={centerY}
        r="18"
        fill="url(#centerGlow)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: dataPoints.length * 0.15 + 0.3 }}
      />
      <defs>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD37A" />
          <stop offset="100%" stopColor="#F2A93B" />
        </radialGradient>
      </defs>
      {centerLabel && (
        <motion.text
          x={centerX}
          y={centerY + 40}
          textAnchor="middle"
          className="fill-solstice font-display font-semibold"
          fontSize="13"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: dataPoints.length * 0.15 + 0.6 }}
        >
          {centerLabel}
        </motion.text>
      )}
    </svg>
  );
}
