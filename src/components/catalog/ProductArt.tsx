// Products without a photo get a printed-poster cover, made from the product's
// id and name: two flat spot colours overprinting each other, halftone dots,
// the name in huge condensed type, and a barcode. The same product always
// gets the same cover.
function hash(text: string) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  }
  return value >>> 0;
}

function next(value: number) {
  value = Math.imul(value ^ (value >>> 15), 2246822519);
  value = Math.imul(value ^ (value >>> 13), 3266489917);
  return (value ^ (value >>> 16)) >>> 0;
}

const SPOTS = ["#ff5a1f", "#2a3cff", "#1fcf9f", "#ff86c8", "#ffd400"];
const INK = "#17130f";

// The words worth printing: the first two, without dashes and numbers-only tails.
function titleWords(label: string | undefined) {
  const words = (label ?? "")
    .split(/[\s—–-]+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word.length > 1)
    .slice(0, 2);
  return words.map((word) => word.toUpperCase().slice(0, 12));
}

export default function ProductArt({ seed, label }: { seed: string; label?: string }) {
  const h = hash(seed);
  const bg = SPOTS[h % SPOTS.length]!;
  const second = SPOTS[(h % SPOTS.length + 1 + ((h >>> 4) % 4)) % SPOTS.length]!;
  const layout = (h >>> 8) % 3;
  const words = titleWords(label);
  const lines = words.length > 0 ? words : ["PASS"];
  const id = `art${h}`;

  // Barcode: bars of random widths.
  const bars: { x: number; w: number }[] = [];
  let seedBits = h;
  for (let x = 24; x < 300; ) {
    seedBits = next(seedBits);
    const w = 2 + (seedBits % 5);
    if (seedBits % 3 !== 0) bars.push({ x, w });
    x += w + 2;
  }

  const size = lines.length === 1 ? 200 : 158;
  const rows = lines.length === 1 ? [{ text: lines[0]!, y: 292, size }] : [
    { text: lines[0]!, y: 262, size },
    { text: lines[1]!, y: 388, size: 128 },
  ];

  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <pattern id={`${id}-dots`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
          <circle cx="4.5" cy="4.5" r="1.9" fill={INK} />
        </pattern>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={`${id}-mask`}>
          <rect width="400" height="500" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>

      <rect width="400" height="500" fill={bg} />

      <g style={{ mixBlendMode: "multiply" }} fill={second}>
        {layout === 0 && (
          <>
            <circle cx="290" cy="150" r="170" />
            <rect x="-40" y="300" width="260" height="260" transform="rotate(-12 90 430)" />
          </>
        )}
        {layout === 1 && (
          <>
            <circle cx="120" cy="170" r="150" />
            <circle cx="250" cy="270" r="150" fill={INK} opacity="0.18" />
          </>
        )}
        {layout === 2 && (
          <>
            <path d="M-20 60 L420 -60 L420 120 L-20 240 Z" />
            <circle cx="330" cy="420" r="120" />
          </>
        )}
      </g>

      <rect width="400" height="500" fill={`url(#${id}-dots)`} mask={`url(#${id}-mask)`} opacity="0.22" />

      <g fill={INK} style={{ mixBlendMode: "multiply" }} fontFamily="Anton, Impact, 'Arial Narrow', sans-serif">
        {rows.map((row) => (
          <text
            key={row.text}
            x="200"
            y={row.y}
            fontSize={row.size}
            textAnchor="middle"
            textLength={Math.min(348, row.text.length * row.size * 0.5)}
            lengthAdjust="spacingAndGlyphs"
          >
            {row.text}
          </text>
        ))}
      </g>

      <g fill={INK} fontFamily="ui-monospace, Menlo, monospace" fontSize="12" fontWeight="700" letterSpacing="2">
        <text x="24" y="38">PASS Nº {100 + (h % 900)}</text>
        {bars.map((bar) => (
          <rect key={bar.x} x={bar.x} y="438" width={bar.w} height="34" />
        ))}
        <text x="24" y="488">{h.toString(16).slice(0, 8).toUpperCase()}</text>
      </g>
    </svg>
  );
}
