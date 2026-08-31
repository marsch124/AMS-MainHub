#!/usr/bin/env python3
"""Generate the AMS Main Hub app icons (no third-party libraries).

Design per the house icon rules: a flat, calm background (warm coral, no glow)
with a hand-drawn white glyph — a 2x2 grid of little rounded squares, one per
corner of the shelf. Each square is nudged and tilted a touch so it reads as
drawn, not generated. Supersampled for smooth edges.
"""
import math, struct, zlib, os

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

TOP = (232, 122, 79)    # warm coral, a whisper lighter up top
BOT = (211, 96, 56)     # and deeper at the bottom
INK = (250, 251, 253)   # the white glyph


def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def smoothstep(e0, e1, x):
    if e1 == e0:
        return 0.0 if x < e0 else 1.0
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def sd_round_square(px, py, cx, cy, half, rad, ang):
    """Signed distance from point to a rounded square rotated by `ang`."""
    ca, sa = math.cos(-ang), math.sin(-ang)
    x = (px - cx) * ca - (py - cy) * sa
    y = (px - cx) * sa + (py - cy) * ca
    qx = abs(x) - (half - rad)
    qy = abs(y) - (half - rad)
    ox, oy = max(qx, 0.0), max(qy, 0.0)
    return math.hypot(ox, oy) + min(max(qx, qy), 0.0) - rad


def render(size, ss, rounded, scale):
    S = size * ss
    px = bytearray(S * S * 4)
    cx = cy = S / 2.0
    corner = S * 0.225 if rounded else 0.0

    off = S * 0.148 * scale * 2          # distance of each square from centre
    half = S * 0.108 * scale * 2         # half-size of a square
    rad = half * 0.42                    # corner radius of the squares
    stroke = S * 0.024
    feather = S * 0.006

    # four squares, each hand-placed: a nudge and a tilt of its own
    squares = [
        (cx - off * 1.03, cy - off * 0.97, half * 1.02, math.radians(-3.2)),
        (cx + off * 0.98, cy - off * 1.04, half * 0.97, math.radians(2.4)),
        (cx - off * 0.99, cy + off * 1.02, half * 0.99, math.radians(2.8)),
        (cx + off * 1.02, cy + off * 0.99, half * 1.03, math.radians(-2.1)),
    ]

    # low-frequency wobble so the strokes feel drawn
    wob_amp = S * 0.0035
    wf = 2 * math.pi / (S * 0.22)

    for y in range(S):
        ty = y / (S - 1)
        base = lerp(TOP, BOT, ty)
        row = y * S * 4
        for x in range(S):
            col = list(base)

            wx = x + math.sin(y * wf * 1.7 + 1.3) * wob_amp
            wy = y + math.sin(x * wf * 1.4 + 4.1) * wob_amp

            dmin = 1e9
            for (sx, sy, sh, sang) in squares:
                d = abs(sd_round_square(wx, wy, sx, sy, sh, rad, sang))
                if d < dmin:
                    dmin = d
            a_core = 1.0 - smoothstep(stroke, stroke + feather, dmin)
            if a_core > 0:
                col = list(lerp(col, INK, a_core))

            alpha = 255
            if rounded:
                ddx = max(0.0, abs(x - cx) - (S / 2 - corner))
                ddy = max(0.0, abs(y - cy) - (S / 2 - corner))
                cd = math.hypot(ddx, ddy)
                alpha = int(round(255 * (1.0 - smoothstep(corner - 1.0, corner + 0.5, cd))))

            o = row + x * 4
            px[o] = int(max(0, min(255, col[0])))
            px[o + 1] = int(max(0, min(255, col[1])))
            px[o + 2] = int(max(0, min(255, col[2])))
            px[o + 3] = alpha

    return downsample(px, S, ss), size


def downsample(px, S, ss):
    out_size = S // ss
    out = bytearray(out_size * out_size * 4)
    inv = 1.0 / (ss * ss)
    for y in range(out_size):
        for x in range(out_size):
            r = g = b = a = 0
            for dy in range(ss):
                sy = (y * ss + dy) * S * 4
                for dx in range(ss):
                    o = sy + (x * ss + dx) * 4
                    r += px[o]; g += px[o + 1]; b += px[o + 2]; a += px[o + 3]
            o = (y * out_size + x) * 4
            out[o] = int(r * inv); out[o + 1] = int(g * inv)
            out[o + 2] = int(b * inv); out[o + 3] = int(a * inv)
    return out


def write_png(path, rgba, size):
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        raw += rgba[y * size * 4:(y + 1) * size * 4]
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


if __name__ == "__main__":
    for size, ss, rounded, scale, name in [
        (512, 3, True,  0.50, "icon-512.png"),
        (192, 3, True,  0.50, "icon-192.png"),
        (180, 3, True,  0.50, "icon-180.png"),
        (512, 3, False, 0.42, "icon-512-maskable.png"),
    ]:
        print(f"Rendering {name}…")
        rgba, _ = render(size, ss, rounded=rounded, scale=scale)
        write_png(os.path.join(OUT, name), rgba, size)
    print("Done →", os.path.abspath(OUT))
