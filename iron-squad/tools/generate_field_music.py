"""Original quiet field loops for Iron Squad. No recordings or sample packs.

Six mono loops, 24 seconds, 22050 Hz. A soft room and a matched loop point
keep them from clicking or stepping forward. Run from anywhere:

    python iron-squad/tools/generate_field_music.py
"""
from pathlib import Path
import hashlib
import json
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'music'
SR = 22050
BPM = 60
BEAT = 60 / BPM
BAR = BEAT * 4
BARS = 6
DUR = BAR * BARS
N = int(round(DUR * SR))
RNG = np.random.default_rng(20261011)


def midi(note):
    return 440 * 2 ** ((note - 69) / 12)


def mix(buf, src, at, gain=1.0):
    if gain == 0 or src is None or len(src) == 0:
        return
    src = np.asarray(src, dtype=float) * gain
    if len(src) > len(buf):
        src = src[:len(buf)]
    start = int(round(at * SR)) % len(buf)
    idx = (start + np.arange(len(src))) % len(buf)
    buf[idx] += src


def shaped(freq, seconds, partials, vel, attack=0.02, release=0.45):
    n = max(8, int(seconds * SR))
    t = np.arange(n) / SR
    x = np.zeros(n)
    for ratio, amp, decay in partials:
        x += np.sin(2 * np.pi * freq * ratio * t) * amp * np.exp(-t * decay)
    att = min(n // 3, max(2, int(attack * SR)))
    rel = min(n // 2, max(2, int(release * SR)))
    x[:att] *= np.linspace(0, 1, att) ** 2
    x[-rel:] *= np.linspace(1, 0, rel)
    return x * vel


def piano(freq, seconds=2.6, vel=0.18):
    partials = []
    b = 0.00032
    for k in range(1, 6):
        ratio = k * np.sqrt(1 + b * k * k)
        partials.append((ratio, 1 / k ** 1.25, 1.15 + k * 1.45))
    x = shaped(freq, seconds, partials, vel, attack=0.03, release=0.55)
    m = min(len(x), int(0.025 * SR))
    noise = RNG.normal(0, 1, m)
    noise = np.convolve(noise, np.ones(4) / 4, mode='same')
    x[:m] += noise * (np.linspace(1, 0, m) ** 2) * vel * 0.025
    return x


def flute(freq, seconds=3.4, vel=0.12):
    n = max(8, int(seconds * SR))
    t = np.arange(n) / SR
    inst = freq * (1 + 0.003 * np.sin(2 * np.pi * 4.6 * t))
    phase = 2 * np.pi * np.cumsum(inst) / SR
    x = (np.sin(phase) + 0.14 * np.sin(2 * phase) + 0.025 * np.sin(3 * phase)) * vel
    att = min(n // 3, int(0.14 * SR))
    rel = min(n // 2, int(0.5 * SR))
    x[:att] *= np.linspace(0, 1, att) ** 2
    x[-rel:] *= np.linspace(1, 0, rel)
    breath = RNG.normal(0, 1, n)
    breath = np.convolve(breath, np.ones(10) / 10, mode='same')
    x += breath * np.linspace(0.4, 1, n) * vel * 0.012
    x[:att] *= np.linspace(0, 1, att)
    return x


def pluck(freq, seconds=1.5, vel=0.11):
    n = max(8, int(seconds * SR))
    period = max(2, int(round(SR / freq)))
    x = np.zeros(n)
    x[:period] = RNG.uniform(-0.6, 0.6, period)
    for i in range(period, n):
        x[i] = 0.496 * (x[i - period] + x[i - period + 1])
    x *= np.exp(-np.arange(n) / SR * 1.7)
    att = min(12, n // 4)
    rel = min(n // 3, int(0.09 * SR))
    x[:att] *= np.linspace(0, 1, att)
    x[-rel:] *= np.linspace(1, 0, rel)
    return x * vel


def organ(freq, seconds=5.2, vel=0.16):
    partials = (
        (0.5, 0.34, 0.08),
        (1, 0.5, 0.08),
        (2, 0.22, 0.12),
        (3, 0.045, 0.2),
        (4, 0.05, 0.22),
    )
    return shaped(freq, seconds, partials, vel, attack=0.2, release=0.85)


def loop_tone(freq, gain, slow=0):
    cycles = max(1, int(round(freq * N / SR)))
    phase = 2 * np.pi * cycles * np.arange(N) / N
    tone = np.sin(phase)
    if slow:
        cycles2 = max(1, cycles + slow)
        tone = tone * 0.72 + np.sin(2 * np.pi * cycles2 * np.arange(N) / N) * 0.28
    return tone * gain


def add_wind(buf, gain):
    noise = RNG.normal(0, 1, N)
    kernel = np.hanning(501)
    kernel /= kernel.sum()
    spec = np.fft.rfft(noise) * np.fft.rfft(kernel, n=N)
    wind = np.fft.irfft(spec, n=N)
    wind -= np.mean(wind)
    peak = np.max(np.abs(wind)) or 1
    buf += wind / peak * gain


def room(buf, amount):
    wet = np.zeros(N)
    for delay, gain in ((0.19, 0.42), (0.27, 0.28), (0.37, 0.18)):
        wet += np.roll(buf, int(delay * SR)) * gain
    a = np.exp(-2 * np.pi * 1600 / SR)
    state = wet[-1]
    for i in range(N):
        state = (1 - a) * wet[i] + a * state
        wet[i] = state
    buf += wet * amount


def at(bar, beat=0):
    return (bar * 4 + beat) * BEAT


def chord(buf, notes, when, seconds, voice, vel):
    for note in notes:
        mix(buf, voice(midi(note), seconds, vel), when)


def finalize(buf, target_rms=0.088, peak_cap=0.56):
    x = np.asarray(buf, dtype=float)
    x -= np.mean(x)
    x = np.tanh(x * 1.15)
    edge = int(0.3 * SR)
    fade = np.linspace(0, 1, edge)
    x[-edge:] = x[-edge:] * (1 - fade) + x[:edge] * fade
    a = np.exp(-2 * np.pi * 3600 / SR)
    state = float(x[-1])
    for _ in range(2):
        for i in range(N):
            state = (1 - a) * x[i] + a * state
            x[i] = state
    x -= np.mean(x)
    rms = float(np.sqrt(np.mean(x * x))) or 1e-9
    x *= target_rms / rms
    peak = float(np.max(np.abs(x))) or 1
    if peak > peak_cap:
        x *= peak_cap / peak
    x[-1] = x[0]
    return x


def save(name, samples):
    pcm = np.clip(np.round(samples * 32767), -32767, 32767).astype('<i2')
    pcm[-1] = pcm[0]
    path = OUT / f'{name}.wav'
    with wave.open(str(path), 'wb') as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(pcm.tobytes())
    data = path.read_bytes()
    audio = pcm.astype(float) / 32768
    info = {
        'file': path.name,
        'seconds': round(len(pcm) / SR, 3),
        'channels': 1,
        'sampleRate': SR,
        'peak': round(float(np.max(np.abs(audio))), 4),
        'rms': round(float(np.sqrt(np.mean(audio * audio))), 4),
        'sha256': hashlib.sha256(data).hexdigest(),
    }
    print(f"{name:8} {info['seconds']:6.2f}s  peak {info['peak']:.3f}  rms {info['rms']:.3f}")
    return info


def piano_track():
    buf = np.zeros(N)
    buf += loop_tone(midi(53), 0.09) + loop_tone(midi(57), 0.04) + loop_tone(midi(60), 0.05)
    left = (
        (0, (41, 48, 53)),
        (1, (48, 52, 55)),
        (2, (50, 53, 57)),
        (3, (46, 50, 53)),
        (4, (41, 48, 57)),
        (5, (48, 52, 55)),
    )
    melody = ((0, 69), (1, 67), (2, 65), (4, 64), (5, 67))
    for bar, notes in left:
        chord(buf, notes, at(bar), 3.7, piano, 0.07)
    for bar, note in melody:
        mix(buf, piano(midi(note), 2.2, 0.05), at(bar, 1))
    room(buf, 0.2)
    return finalize(buf, 0.086)


def celtic_track():
    buf = np.zeros(N)
    buf += loop_tone(midi(38), 0.05, slow=1)
    bars = (
        (0, (50, 57, 62), (50, 57, 62)),
        (1, (48, 55, 60), (48, 55, 64)),
        (2, (46, 53, 58), (46, 53, 58)),
        (3, (53, 57, 60), (53, 60, 65)),
        (4, (50, 57, 62), (50, 57, 62)),
        (5, (48, 55, 64), (48, 55, 60)),
    )
    for bar, chord_notes, harp in bars:
        chord(buf, chord_notes[:2], at(bar), 3.8, organ, 0.045)
        for beat, note in enumerate(harp):
            if beat == 2 and bar % 2:
                continue
            mix(buf, pluck(midi(note), 1.35, 0.1), at(bar, beat))
    mix(buf, flute(midi(69), 3.6, 0.11), at(0, 2))
    mix(buf, flute(midi(67), 3.2, 0.09), at(3, 1))
    room(buf, 0.18)
    return finalize(buf, 0.084)


def highland_track():
    buf = np.zeros(N)
    buf += loop_tone(midi(45), 0.07, slow=1) + loop_tone(midi(52), 0.04)
    pairs = ((0, (45, 52)), (2, (43, 50)), (4, (45, 52)))
    for bar, notes in pairs:
        chord(buf, notes, at(bar), 7.2, piano, 0.07)
    mix(buf, piano(midi(76), 3.5, 0.05), at(3, 2))
    add_wind(buf, 0.012)
    room(buf, 0.16)
    return finalize(buf, 0.08)


def salt_track():
    buf = np.zeros(N)
    buf += loop_tone(midi(55), 0.03) + loop_tone(midi(62), 0.025)
    phrases = ((0, 67, 3.2), (2, 69, 2.6), (4, 71, 2.4), (5, 67, 2.8))
    for bar, note, seconds in phrases:
        mix(buf, flute(midi(note), seconds, 0.1), at(bar, 0.5))
    add_wind(buf, 0.01)
    room(buf, 0.22)
    return finalize(buf, 0.078)


def vesper_track():
    buf = np.zeros(N)
    beds = (
        (0, (38, 50, 57), 8.4),
        (2, (41, 53, 60), 8.4),
        (4, (36, 48, 55), 8.6),
    )
    for bar, notes, seconds in beds:
        chord(buf, notes, at(bar), seconds, organ, 0.09)
    for bar, note in ((1, 65), (3, 64), (5, 62)):
        mix(buf, piano(midi(note), 2.4, 0.06), at(bar, 1.5))
    room(buf, 0.24)
    return finalize(buf, 0.086)


def organ_track():
    buf = np.zeros(N)
    beds = (
        (0, (38, 50, 57), 8.6),
        (2, (34, 46, 53), 8.6),
        (4, (36, 48, 55), 5.0),
        (5, (43, 55, 59), 4.6),
    )
    for bar, notes, seconds in beds:
        chord(buf, notes, at(bar), seconds, organ, 0.12)
    room(buf, 0.26)
    return finalize(buf, 0.09)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tracks = {
        'piano': piano_track(),
        'celtic': celtic_track(),
        'highland': highland_track(),
        'salt': salt_track(),
        'vesper': vesper_track(),
        'organ': organ_track(),
    }
    manifest = {
        'origin': 'original procedural field music',
        'sampleRate': SR,
        'channels': 1,
        'seconds': round(DUR, 3),
        'clips': {name: save(name, audio) for name, audio in tracks.items()},
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    total = sum(path.stat().st_size for path in OUT.glob('*.wav'))
    print(f'wrote {len(tracks)} loops, {total / 1024 / 1024:.2f} MiB')


if __name__ == '__main__':
    main()
