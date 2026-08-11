/**
 * Illustrated "photos" for the demo journal.
 *
 * The demo has to look like a real journal — with images — without shipping
 * megabytes of stock photography or phoning out to a CDN (the app is
 * offline-first and the service worker precaches everything). So the demo's
 * photos are small hand-built SVG scenes stored as blobs, exactly like a real
 * photo would be. They read as illustrations rather than pretending to be
 * someone's snapshots, which is the honest thing for sample data.
 */

export type SceneKey =
  | 'sunrise'
  | 'coast'
  | 'city-night'
  | 'forest'
  | 'desert'
  | 'rain'
  | 'mountains'
  | 'harbor'

const W = 1200
const H = 900

/** Tiny deterministic PRNG so a scene renders identically every time. */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function wrap(defs: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>${body}</svg>`
}

/** A vertical linear gradient from a list of [offset%, color] stops. */
function vgrad(id: string, stops: [number, string][]): string {
  const s = stops.map(([o, c]) => `<stop offset="${o}%" stop-color="${c}"/>`).join('')
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${s}</linearGradient>`
}

const scenes: Record<SceneKey, () => string> = {
  sunrise: () =>
    wrap(
      vgrad('sky', [
        [0, '#3d2b52'],
        [38, '#c2606b'],
        [66, '#f0956a'],
        [100, '#ffce9a'],
      ]),
      `<rect width="${W}" height="${H}" fill="url(#sky)"/>
       <circle cx="760" cy="600" r="96" fill="#fff0d4" opacity="0.95"/>
       <circle cx="760" cy="600" r="150" fill="#ffd9a8" opacity="0.28"/>
       <path d="M0 690 C 220 620 360 700 560 664 C 760 628 900 690 1200 640 L1200 900 L0 900 Z" fill="#7c4a5c" opacity="0.85"/>
       <path d="M0 762 C 260 700 420 774 660 742 C 900 710 1040 768 1200 736 L1200 900 L0 900 Z" fill="#54314a"/>
       <path d="M0 838 C 300 790 520 848 780 824 C 980 806 1080 836 1200 820 L1200 900 L0 900 Z" fill="#33203a"/>`,
    ),

  coast: () =>
    wrap(
      vgrad('sky', [
        [0, '#8fc4e8'],
        [52, '#cfe6f2'],
        [100, '#f2e4cd'],
      ]) +
        vgrad('sea', [
          [0, '#2f7e94'],
          [100, '#71b5c0'],
        ]),
      `<rect width="${W}" height="${H}" fill="url(#sky)"/>
       <circle cx="980" cy="180" r="58" fill="#fff6e2" opacity="0.9"/>
       <rect y="470" width="${W}" height="250" fill="url(#sea)"/>
       ${[510, 552, 596, 642, 690]
         .map(
           (y, i) =>
             `<path d="M0 ${y} q 150 ${i % 2 ? 16 : -16} 300 0 t 300 0 t 300 0 t 300 0" stroke="#e8f4f6" stroke-width="${3 - i * 0.4}" fill="none" opacity="${0.5 - i * 0.06}"/>`,
         )
         .join('')}
       <path d="M0 720 C 240 690 420 742 700 726 C 900 714 1060 744 1200 726 L1200 900 L0 900 Z" fill="#e3cfa6"/>
       <path d="M0 800 C 300 776 560 812 820 798 C 1000 788 1120 806 1200 796 L1200 900 L0 900 Z" fill="#d3ba8c"/>
       <ellipse cx="196" cy="742" rx="64" ry="26" fill="#a8916b" opacity="0.7"/>
       <ellipse cx="1042" cy="762" rx="48" ry="20" fill="#a8916b" opacity="0.6"/>`,
    ),

  'city-night': () => {
    const rand = rng(7)
    const buildings: string[] = []
    let x = -40
    while (x < W + 40) {
      const w = 60 + Math.floor(rand() * 90)
      const h = 180 + Math.floor(rand() * 380)
      const top = H - 120 - h
      const shade = ['#1d2440', '#232b4c', '#171d36'][Math.floor(rand() * 3)]
      const windows: string[] = []
      for (let wy = top + 22; wy < H - 150; wy += 34) {
        for (let wx = x + 14; wx < x + w - 18; wx += 26) {
          if (rand() > 0.42) {
            windows.push(
              `<rect x="${wx}" y="${wy}" width="10" height="14" fill="#ffd98a" opacity="${(0.35 + rand() * 0.6).toFixed(2)}"/>`,
            )
          }
        }
      }
      buildings.push(
        `<rect x="${x}" y="${top}" width="${w}" height="${h + 120}" fill="${shade}"/>${windows.join('')}`,
      )
      x += w + 8
    }
    return wrap(
      vgrad('sky', [
        [0, '#0c1023'],
        [58, '#232a4d'],
        [100, '#5a4568'],
      ]),
      `<rect width="${W}" height="${H}" fill="url(#sky)"/>
       <circle cx="242" cy="164" r="46" fill="#f3efe0" opacity="0.92"/>
       <circle cx="242" cy="164" r="86" fill="#f3efe0" opacity="0.1"/>
       ${buildings.join('')}
       <rect y="${H - 92}" width="${W}" height="92" fill="#0d1122"/>`,
    )
  },

  forest: () => {
    const rand = rng(19)
    const layers = [
      { y: 560, color: '#4e7a5c', scale: 1, opacity: 0.55 },
      { y: 660, color: '#3a6249', shift: 40, scale: 1.25, opacity: 0.8 },
      { y: 790, color: '#254536', shift: 90, scale: 1.6, opacity: 1 },
    ]
    const trees = layers
      .map((l) => {
        const parts: string[] = []
        for (let x = -60; x < W + 60; x += 70 / l.scale) {
          const h = (150 + rand() * 90) * l.scale
          const w = (34 + rand() * 18) * l.scale
          parts.push(
            `<path d="M${x} ${l.y} l ${w / 2} ${-h} l ${w / 2} ${h} Z" fill="${l.color}" opacity="${l.opacity}"/>`,
          )
        }
        return `<g>${parts.join('')}</g><rect y="${l.y}" width="${W}" height="${H - l.y}" fill="${l.color}" opacity="${l.opacity}"/>`
      })
      .join('')
    return wrap(
      vgrad('sky', [
        [0, '#dfe9dd'],
        [55, '#bcd2c2'],
        [100, '#9dbcab'],
      ]),
      `<rect width="${W}" height="${H}" fill="url(#sky)"/>
       <circle cx="880" cy="220" r="120" fill="#ffffff" opacity="0.35"/>
       ${trees}
       <rect y="520" width="${W}" height="120" fill="#ffffff" opacity="0.18"/>
       <rect y="640" width="${W}" height="90" fill="#ffffff" opacity="0.12"/>`,
    )
  },

  desert: () =>
    wrap(
      vgrad('sky', [
        [0, '#f6c98a'],
        [45, '#efa678'],
        [100, '#d97f6c'],
      ]),
      `<rect width="${W}" height="${H}" fill="url(#sky)"/>
       <circle cx="380" cy="300" r="70" fill="#fff2d2" opacity="0.9"/>
       <path d="M0 600 C 240 540 420 620 700 592 C 940 568 1080 612 1200 588 L1200 900 L0 900 Z" fill="#cf9463"/>
       <path d="M0 706 C 280 656 520 726 800 704 C 1000 688 1120 714 1200 700 L1200 900 L0 900 Z" fill="#b97b51"/>
       <path d="M0 812 C 320 772 600 828 900 812 C 1060 804 1140 818 1200 812 L1200 900 L0 900 Z" fill="#9c6242"/>
       <g fill="#5f4a35">
         <rect x="880" y="600" width="26" height="200" rx="13"/>
         <rect x="828" y="662" width="22" height="90" rx="11"/>
         <rect x="828" y="662" width="72" height="22" rx="11"/>
         <rect x="936" y="636" width="22" height="110" rx="11"/>
         <rect x="886" y="636" width="72" height="22" rx="11"/>
       </g>`,
    ),

  rain: () => {
    const rand = rng(31)
    const drops: string[] = []
    for (let i = 0; i < 140; i++) {
      const x = rand() * W
      const y = rand() * H
      const len = 26 + rand() * 52
      drops.push(
        `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 14).toFixed(0)}" y2="${(y + len).toFixed(0)}" stroke="#dfeaf2" stroke-width="2" opacity="${(0.16 + rand() * 0.4).toFixed(2)}"/>`,
      )
    }
    const glow = [
      [220, 640, 70, '#ffcf87'],
      [520, 700, 54, '#ffd9a0'],
      [880, 620, 84, '#ffc478'],
      [1080, 690, 46, '#ffe0ad'],
    ] as const
    return wrap(
      vgrad('sky', [
        [0, '#2c3a4a'],
        [60, '#41525f'],
        [100, '#5d6f74'],
      ]),
      `<rect width="${W}" height="${H}" fill="url(#sky)"/>
       ${glow.map(([cx, cy, r, c]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" opacity="0.34"/>`).join('')}
       ${glow.map(([cx, cy, r, c]) => `<circle cx="${cx}" cy="${cy}" r="${r / 3}" fill="${c}" opacity="0.8"/>`).join('')}
       <rect y="740" width="${W}" height="160" fill="#22303c" opacity="0.85"/>
       ${glow.map(([cx, , r, c]) => `<rect x="${cx - r / 6}" y="740" width="${r / 3}" height="160" fill="${c}" opacity="0.22"/>`).join('')}
       ${drops.join('')}`
    )
  },

  mountains: () =>
    wrap(
      vgrad('sky', [
        [0, '#20364f'],
        [48, '#4f7290'],
        [100, '#a9c4cf'],
      ]) +
        vgrad('lake', [
          [0, '#3b5f74'],
          [100, '#22394a'],
        ]),
      `<rect width="${W}" height="${H}" fill="url(#sky)"/>
       <circle cx="300" cy="190" r="42" fill="#f6f2e4" opacity="0.9"/>
       <path d="M-40 600 L200 300 L360 470 L520 250 L760 600 Z" fill="#3b566b"/>
       <path d="M520 250 L604 372 L560 392 L516 356 L470 386 Z" fill="#eaf1f4"/>
       <path d="M200 300 L262 392 L228 404 L196 376 L164 400 Z" fill="#eaf1f4"/>
       <path d="M600 600 L860 320 L1000 480 L1120 380 L1260 600 Z" fill="#2e4557"/>
       <path d="M860 320 L928 420 L890 436 L858 406 L826 432 Z" fill="#dbe6ec"/>
       <rect y="600" width="${W}" height="300" fill="url(#lake)"/>
       <path d="M-40 600 L200 760 L360 640 L520 800 L760 600 Z" fill="#33506a" opacity="0.45"/>
       ${[640, 686, 738, 796]
         .map(
           (y, i) =>
             `<path d="M0 ${y} q 160 ${i % 2 ? 12 : -12} 320 0 t 320 0 t 320 0 t 320 0" stroke="#cfe2ea" stroke-width="2" fill="none" opacity="${0.28 - i * 0.05}"/>`,
         )
         .join('')}`,
    ),

  harbor: () => {
    const rand = rng(53)
    const masts: string[] = []
    for (let i = 0; i < 9; i++) {
      const x = 120 + i * 118 + rand() * 24
      const h = 150 + rand() * 130
      masts.push(
        `<rect x="${x.toFixed(0)}" y="${(640 - h).toFixed(0)}" width="4" height="${h.toFixed(0)}" fill="#2f2a35" opacity="0.85"/>
         <path d="M${(x + 4).toFixed(0)} ${(640 - h + 18).toFixed(0)} l 42 ${(h * 0.55).toFixed(0)} l -42 0 Z" fill="#efe3d2" opacity="${(0.5 + rand() * 0.4).toFixed(2)}"/>`,
      )
    }
    return wrap(
      vgrad('sky', [
        [0, '#f7c9a0'],
        [40, '#e79f8e'],
        [100, '#8d6a93'],
      ]) +
        vgrad('water', [
          [0, '#6b5b83'],
          [100, '#3d3557'],
        ]),
      `<rect width="${W}" height="${H}" fill="url(#sky)"/>
       <circle cx="960" cy="420" r="74" fill="#fff1d5" opacity="0.85"/>
       ${masts.join('')}
       <rect y="640" width="${W}" height="60" fill="#2f2a35"/>
       <rect y="700" width="${W}" height="200" fill="url(#water)"/>
       <rect x="920" y="700" width="80" height="200" fill="#ffe2b8" opacity="0.22"/>
       ${[724, 768, 818, 868]
         .map(
           (y, i) =>
             `<path d="M0 ${y} q 140 ${i % 2 ? 14 : -14} 280 0 t 280 0 t 280 0 t 280 0 t 280 0" stroke="#d9c7e0" stroke-width="2" fill="none" opacity="${0.3 - i * 0.06}"/>`,
         )
         .join('')}`,
    )
  },
}

export const SCENE_KEYS = Object.keys(scenes) as SceneKey[]

/** Render a scene to an SVG blob, ready to store like any other photo. */
export function sceneBlob(key: SceneKey): Blob {
  return new Blob([scenes[key]()], { type: 'image/svg+xml' })
}

export const SCENE_SIZE = { width: W, height: H }
