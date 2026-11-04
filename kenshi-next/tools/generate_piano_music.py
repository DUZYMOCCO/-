"""Procedural ambient piano music generator for Kenshi-Next.
Generates 12 peaceful, unobtrusive piano pieces for the desert wasteland.
"""
from pathlib import Path
import json
import math
import shutil
import subprocess
import tempfile
import wave
import hashlib
import numpy as np

try:
    import imageio_ffmpeg
    FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_BIN = shutil.which('ffmpeg')

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'music'
SR = 22050

def midi_to_hz(note):
    return 440.0 * (2.0 ** ((note - 69.0) / 12.0))

class PianoSynth:
    def __init__(self, sr=SR, seed=20261102):
        self.sr = sr
        self.rng = np.random.default_rng(seed)

    def note(self, midi_num, duration=3.5, vel=0.22):
        """Synthesize a single rich, warm acoustic piano note."""
        freq = midi_to_hz(midi_num)
        n = max(16, int(round(duration * self.sr)))
        t = np.arange(n, dtype=np.float32) / self.sr
        
        # Inharmonicity constant (stiffness of piano wire)
        b = 0.00015 + (midi_num / 127.0) * 0.00020
        
        buf = np.zeros(n, dtype=np.float32)
        
        # Up to 9 harmonics depending on frequency
        max_harm = min(9, int(7500 / max(freq, 25)))
        for k in range(1, max_harm + 1):
            f_k = freq * k * math.sqrt(1.0 + b * k * k)
            if f_k >= self.sr * 0.46:
                break
            
            # Decay rate: higher harmonics decay faster, lower notes sustain longer
            base_decay = 0.75 + (127 - midi_num) * 0.022
            decay_k = base_decay * (1.0 + (k - 1) * 0.58)
            
            # Amplitude roll-off (warm felt piano tone)
            amp_k = (1.0 / (k ** 1.38)) * (0.82 ** (k - 1))
            
            # Subtle unison detuning (beating between 2-3 piano strings)
            unison_detune = 0.0014 * f_k
            p1 = self.rng.uniform(0, 2 * np.pi)
            p2 = self.rng.uniform(0, 2 * np.pi)
            
            tone = (np.sin(2 * np.pi * f_k * t + p1) * 0.54 + 
                    np.sin(2 * np.pi * (f_k + unison_detune) * t + p2) * 0.46)
            buf += (tone * amp_k * np.exp(-t * decay_k)).astype(np.float32)
            
        # Wooden hammer felt impact noise
        felt_len = min(n, int(0.038 * self.sr))
        felt_t = np.arange(felt_len, dtype=np.float32) / self.sr
        noise = self.rng.normal(0, 1, felt_len).astype(np.float32)
        noise = np.convolve(noise, np.ones(5) / 5, mode='same')
        felt_env = (np.cos(np.pi * felt_t / (felt_len / self.sr)) * 0.5 + 0.5) ** 2
        buf[:felt_len] += noise * felt_env * (vel * 0.035)
        
        # Soft attack curve
        att_len = min(n // 4, max(4, int(0.018 * self.sr)))
        buf[:att_len] *= (np.sin(np.linspace(0, np.pi / 2, att_len)) ** 2).astype(np.float32)
        
        # Smooth release tail
        rel_len = min(n // 3, max(8, int(0.18 * self.sr)))
        buf[-rel_len:] *= np.linspace(1, 0, rel_len, dtype=np.float32)
        
        return buf * vel

def stereo_reverb(left, right, sr=SR, wet=0.40):
    """Deep, serene ambient hall reverb."""
    n = len(left)
    delays_l = [int(sr * d) for d in [0.032, 0.045, 0.063, 0.082]]
    delays_r = [int(sr * d) for d in [0.035, 0.049, 0.067, 0.088]]
    decays = [0.80, 0.76, 0.72, 0.67]
    
    out_l = np.copy(left)
    out_r = np.copy(right)
    
    rev_l = np.zeros(n, dtype=np.float32)
    rev_r = np.zeros(n, dtype=np.float32)
    
    for d, g in zip(delays_l, decays):
        rev_l += np.roll(left, d) * g
    for d, g in zip(delays_r, decays):
        rev_r += np.roll(right, d) * g
        
    # Lowpass damping (softens echoes to sound like distant stone/sand acoustic)
    alpha = float(np.exp(-2 * np.pi * 2600 / sr))
    sl, sr_val = 0.0, 0.0
    for i in range(n):
        sl = (1.0 - alpha) * rev_l[i] + alpha * sl
        rev_l[i] = sl
        sr_val = (1.0 - alpha) * rev_r[i] + alpha * sr_val
        rev_r[i] = sr_val
        
    res_l = out_l * (1.0 - wet * 0.45) + rev_l * wet
    res_r = out_r * (1.0 - wet * 0.45) + rev_r * wet
    return res_l, res_r

def add_desert_wind(left, right, n, sr=SR, gain=0.009, rng=None):
    """Subtle desert ambient air."""
    if rng is None:
        rng = np.random.default_rng(42)
    noise_l = rng.normal(0, 1, n).astype(np.float32)
    noise_r = rng.normal(0, 1, n).astype(np.float32)
    
    alpha = float(np.exp(-2 * np.pi * 160 / sr))
    sl, sr_val = 0.0, 0.0
    for i in range(n):
        sl = (1.0 - alpha) * noise_l[i] + alpha * sl
        noise_l[i] = sl
        sr_val = (1.0 - alpha) * noise_r[i] + alpha * sr_val
        noise_r[i] = sr_val
        
    mod = (np.sin(np.linspace(0, 2 * np.pi * 2.5, n)) * 0.2 + 0.8).astype(np.float32)
    left += noise_l * mod * gain
    right += noise_r * mod * gain

def render_track(synth, notes_with_timing, total_seconds=28.0, wind_gain=0.008):
    sr = synth.sr
    n = int(round(total_seconds * sr))
    left = np.zeros(n, dtype=np.float32)
    right = np.zeros(n, dtype=np.float32)
    
    for midi_num, start_sec, dur_sec, vel in notes_with_timing:
        note_buf = synth.note(midi_num, dur_sec, vel)
        note_len = len(note_buf)
        start_idx = int(round(start_sec * sr)) % n
        
        # Panning: natural acoustic keyboard spread
        pan = 0.35 + (midi_num - 36) / 52.0 * 0.30
        pan = max(0.2, min(0.8, pan))
        gain_l = math.cos(pan * math.pi / 2)
        gain_r = math.sin(pan * math.pi / 2)
        
        # Mix with loop wraparound
        idx = (start_idx + np.arange(note_len)) % n
        left[idx] += note_buf * gain_l
        right[idx] += note_buf * gain_r
        
    left, right = stereo_reverb(left, right, sr=sr, wet=0.42)
    
    if wind_gain > 0:
        add_desert_wind(left, right, n, sr=sr, gain=wind_gain, rng=synth.rng)
        
    for buf in [left, right]:
        buf -= np.mean(buf)
        
    # Seamless loop boundary fade
    edge = int(0.6 * sr)
    fade = np.linspace(0, 1, edge, dtype=np.float32)
    left[-edge:] = left[-edge:] * (1.0 - fade) + left[:edge] * fade
    right[-edge:] = right[-edge:] * (1.0 - fade) + right[:edge] * fade
    left[-1] = left[0]
    right[-1] = right[0]
    
    rms = math.sqrt(float(np.mean(left**2 + right**2) * 0.5)) or 1e-9
    target_rms = 0.068
    scale = target_rms / rms
    left *= scale
    right *= scale
    
    peak = max(float(np.max(np.abs(left))), float(np.max(np.abs(right)))) or 1e-9
    if peak > 0.55:
        scale_peak = 0.55 / peak
        left *= scale_peak
        right *= scale_peak
        
    return left, right

def save_m4a(name, left, right, sr=SR):
    OUT.mkdir(parents=True, exist_ok=True)
    m4a_path = OUT / f"{name}.m4a"
    
    l16 = np.clip(np.round(left * 32767), -32767, 32767).astype('<i2')
    r16 = np.clip(np.round(right * 32767), -32767, 32767).astype('<i2')
    stereo = np.empty((len(l16) * 2,), dtype='<i2')
    stereo[0::2] = l16
    stereo[1::2] = r16
    
    with tempfile.TemporaryDirectory() as tmp:
        wav_path = Path(tmp) / f"{name}.wav"
        with wave.open(str(wav_path), 'wb') as wav_file:
            wav_file.setnchannels(2)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sr)
            wav_file.writeframes(stereo.tobytes())
            
        cmd = [
            FFMPEG_BIN, '-y',
            '-i', str(wav_path),
            '-c:a', 'aac',
            '-b:a', '64k',
            '-ar', str(sr),
            str(m4a_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg failed: {res.stderr.decode('utf-8', errors='ignore')}")
            
    # Calculate sha256
    with open(m4a_path, 'rb') as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
        
    size_kb = m4a_path.stat().st_size / 1024
    print(f"[{name}] {size_kb:.1f} KB (hash: {file_hash[:8]}...)")
    return {
        "file": f"{name}.m4a",
        "size_kb": round(size_kb, 1),
        "sha256": file_hash
    }

# ==============================================================================
# 12 Peaceful Ambient Piano Tracks Composition Data
# Each note: (midi_number, start_time_seconds, duration_seconds, velocity)
# ==============================================================================

def get_track_data():
    tracks = {}
    
    # --------------------------------------------------------------------------
    # Track 1: Solitude in the Sands (砂海の孤独) - D Dorian, slow, reflective
    # --------------------------------------------------------------------------
    dur = 28.0
    notes = [
        # Bass pedal tones
        (38, 0.0, 7.0, 0.24),    # D2
        (45, 0.8, 6.0, 0.18),    # A2
        (38, 7.0, 7.0, 0.22),    # D2
        (43, 7.8, 6.0, 0.17),    # G2
        (38, 14.0, 7.0, 0.24),   # D2
        (45, 14.8, 6.0, 0.18),   # A2
        (36, 21.0, 7.0, 0.22),   # C2
        (43, 21.8, 6.0, 0.16),   # G2
        # Meditative melody
        (62, 1.5, 4.0, 0.20),    # D4
        (65, 3.2, 3.5, 0.18),    # F4
        (69, 5.0, 4.5, 0.22),    # A4
        (67, 8.5, 3.8, 0.19),    # G4
        (64, 10.5, 3.2, 0.17),   # E4
        (62, 12.0, 4.0, 0.21),   # D4
        (60, 15.5, 3.5, 0.18),   # C4
        (65, 17.2, 3.8, 0.20),   # F4
        (69, 19.0, 4.0, 0.22),   # A4
        (67, 22.5, 4.2, 0.19),   # G4
        (65, 24.5, 3.5, 0.17),   # F4
        (62, 26.0, 4.5, 0.20),   # D4
    ]
    tracks['track01_solitude'] = {
        'title': '砂海の孤独',
        'title_en': 'Solitude in the Sands',
        'desc': '乾いた風が吹き抜ける砂漠。孤独な歩みを静かに見守る瞑想的な調べ。',
        'mood': 'wasteland',
        'time': 'day',
        'duration': dur,
        'notes': notes
    }

    # --------------------------------------------------------------------------
    # Track 2: Twilight Journey (黄昏の旅情) - A Minor, melancholic, warm
    # --------------------------------------------------------------------------
    dur = 28.0
    notes = [
        # Bass & Chords (Am - Fmaj7 - C - G6)
        (45, 0.0, 6.5, 0.22),    # A2
        (52, 0.5, 5.5, 0.16),    # E3
        (57, 1.0, 5.0, 0.17),    # A3
        (41, 7.0, 6.5, 0.22),    # F2
        (48, 7.5, 5.5, 0.16),    # C3
        (57, 8.0, 5.0, 0.17),    # A3
        (48, 14.0, 6.5, 0.22),   # C3
        (55, 14.5, 5.5, 0.16),   # G3
        (52, 15.0, 5.0, 0.17),   # E3
        (43, 21.0, 6.5, 0.20),   # G2
        (50, 21.5, 5.5, 0.15),   # D3
        (59, 22.0, 5.0, 0.16),   # B3
        # Melodic line
        (64, 2.0, 3.5, 0.19),    # E4
        (60, 3.8, 3.0, 0.17),    # C4
        (62, 5.2, 3.2, 0.18),    # D4
        (65, 9.0, 3.5, 0.20),    # F4
        (64, 11.0, 3.2, 0.18),   # E4
        (60, 12.5, 3.0, 0.16),   # C4
        (67, 16.0, 3.8, 0.21),   # G4
        (65, 18.0, 3.2, 0.18),   # F4
        (64, 19.5, 3.0, 0.17),   # E4
        (62, 23.0, 3.5, 0.19),   # D4
        (59, 24.8, 3.2, 0.16),   # B3
        (60, 26.2, 4.0, 0.18),   # C4
    ]
    tracks['track02_dusk'] = {
        'title': '黄昏の旅路',
        'title_en': 'Twilight Journey',
        'desc': '茜色に染まる地平線。長い旅の一日の終わりを包むノスタルジックな響き。',
        'mood': 'dusk',
        'time': 'dusk',
        'duration': dur,
        'notes': notes
    }

    # --------------------------------------------------------------------------
    # Track 3: Nightfall Oasis (満天の夜空) - E Minor, pianissimo, sparse high notes
    # --------------------------------------------------------------------------
    dur = 30.0
    notes = [
        # Low deep bass
        (40, 0.0, 7.5, 0.20),    # E2
        (47, 1.2, 6.0, 0.15),    # B2
        (38, 7.5, 7.0, 0.19),    # D2
        (45, 8.5, 6.0, 0.14),    # A2
        (36, 15.0, 7.5, 0.20),   # C2
        (43, 16.0, 6.0, 0.15),   # G2
        (35, 22.5, 7.5, 0.19),   # B1
        (42, 23.5, 6.0, 0.14),   # F#2
        # Delicate crystalline upper notes (stars)
        (71, 2.5, 4.5, 0.16),    # B4
        (76, 4.8, 4.0, 0.14),    # E5
        (74, 9.5, 4.2, 0.15),    # D5
        (69, 12.0, 3.8, 0.13),   # A4
        (72, 17.0, 4.0, 0.15),   # C5
        (76, 19.5, 4.5, 0.16),   # E5
        (74, 24.0, 4.0, 0.14),   # D5
        (71, 26.5, 4.8, 0.15),   # B4
    ]
    tracks['track03_nightfall'] = {
        'title': '砂海の夜空',
        'title_en': 'Nightfall Oasis',
        'desc': '冷たく澄んだ砂漠の夜。満天の星屑を映す静寂のアルペジオ。',
        'mood': 'night',
        'time': 'night',
        'duration': dur,
        'notes': notes
    }

    # --------------------------------------------------------------------------
    # Track 4: Silent Spring (木陰と湧水) - F Lydian, serene, crystalline
    # --------------------------------------------------------------------------
    dur = 28.0
    notes = [
        # Fmaj7(#11) - G6 - Am9 - Em
        (41, 0.0, 6.5, 0.20),    # F2
        (48, 0.6, 5.5, 0.15),    # C3
        (55, 1.2, 5.0, 0.16),    # G3
        (43, 7.0, 6.5, 0.19),    # G2
        (50, 7.6, 5.5, 0.14),    # D3
        (57, 8.2, 5.0, 0.15),    # A3
        (45, 14.0, 6.5, 0.20),   # A2
        (52, 14.6, 5.5, 0.15),   # E3
        (59, 15.2, 5.0, 0.16),   # B3
        (40, 21.0, 6.5, 0.19),   # E2
        (47, 21.6, 5.5, 0.14),   # B2
        (55, 22.2, 5.0, 0.15),   # G3
        # Water droplets melody
        (65, 2.0, 3.2, 0.18),    # F4
        (71, 3.5, 3.5, 0.17),    # B4 (Lydian #4)
        (72, 5.0, 3.5, 0.19),    # C5
        (67, 9.0, 3.2, 0.17),    # G4
        (74, 10.5, 3.5, 0.18),   # D5
        (69, 16.0, 3.5, 0.19),   # A4
        (76, 17.5, 3.8, 0.20),   # E5
        (74, 23.0, 3.2, 0.17),   # D5
        (71, 24.8, 3.8, 0.16),   # B4
    ]
    tracks['track04_oasis'] = {
        'title': '木陰と湧水',
        'title_en': 'Silent Spring',
        'desc': '不毛の大地で見つけた小さな泉。水滴のように澄みわたる安息の音。',
        'mood': 'oasis',
        'time': 'any',
        'duration': dur,
        'notes': notes
    }

    # --------------------------------------------------------------------------
    # Track 5: Forgotten Relics (忘却の遺構) - B Minor, antique, mysterious
    # --------------------------------------------------------------------------
    dur = 28.0
    notes = [
        # Bm9 - Gmaj7 - D - F#m
        (35, 0.0, 6.8, 0.22),    # B1
        (42, 0.8, 5.5, 0.16),    # F#2
        (47, 1.4, 5.0, 0.15),    # B2
        (43, 7.0, 6.8, 0.21),    # G2
        (50, 7.8, 5.5, 0.15),    # D3
        (54, 8.4, 5.0, 0.16),    # F#3
        (38, 14.0, 6.8, 0.22),   # D2
        (45, 14.8, 5.5, 0.16),   # A2
        (50, 15.4, 5.0, 0.15),   # D3
        (42, 21.0, 6.8, 0.20),   # F#2
        (49, 21.8, 5.5, 0.15),   # C#3
        (54, 22.4, 5.0, 0.16),   # F#3
        # Antique motif
        (62, 2.2, 3.5, 0.18),    # D4
        (61, 4.0, 3.0, 0.16),    # C#4
        (59, 5.5, 3.5, 0.19),    # B3
        (66, 9.2, 3.8, 0.20),    # F#4
        (62, 11.2, 3.2, 0.17),   # D4
        (69, 16.2, 4.0, 0.20),   # A4
        (66, 18.2, 3.5, 0.18),   # F#4
        (61, 23.0, 3.5, 0.17),   # C#4
        (59, 25.0, 4.2, 0.19),   # B3
    ]
    tracks['track05_ruins'] = {
        'title': '忘却の遺構',
        'title_en': 'Forgotten Relics',
        'desc': '風化した古代機械の骨組み。遥か過去の記憶が静かに蘇る。',
        'mood': 'ruins',
        'time': 'any',
        'duration': dur,
        'notes': notes
    }

    # --------------------------------------------------------------------------
    # Track 6: Settlement Hearth (集落の灯火) - C Major, warm, gentle
    # --------------------------------------------------------------------------
    dur = 28.0
    notes = [
        # C - Em7 - Fmaj7 - G
        (36, 0.0, 6.5, 0.21),    # C2
        (43, 0.5, 5.5, 0.15),    # G2
        (48, 1.0, 5.0, 0.16),    # C3
        (40, 7.0, 6.5, 0.20),    # E2
        (47, 7.5, 5.5, 0.15),    # B2
        (52, 8.0, 5.0, 0.16),    # E3
        (41, 14.0, 6.5, 0.21),   # F2
        (48, 14.5, 5.5, 0.15),   # C3
        (52, 15.0, 5.0, 0.16),   # E3
        (43, 21.0, 6.5, 0.20),   # G2
        (50, 21.5, 5.5, 0.15),   # D3
        (55, 22.0, 5.0, 0.16),   # G3
        # Peaceful domestic melody
        (60, 1.8, 3.2, 0.18),    # C4
        (64, 3.2, 3.0, 0.17),    # E4
        (67, 4.8, 3.5, 0.19),    # G4
        (64, 8.8, 3.2, 0.18),    # E4
        (62, 10.5, 3.0, 0.16),   # D4
        (60, 12.0, 3.2, 0.17),   # C4
        (65, 15.8, 3.5, 0.19),   # F4
        (64, 17.5, 3.2, 0.17),   # E4
        (62, 19.0, 3.2, 0.18),   # D4
        (60, 22.8, 4.0, 0.18),   # C4
        (59, 24.5, 3.2, 0.15),   # B3
        (60, 26.0, 4.2, 0.19),   # C4
    ]
    tracks['track06_settlement'] = {
        'title': '集落の灯火',
        'title_en': 'Settlement Hearth',
        'desc': '人々の声が微かに聞こえる拠点。旅人が羽を休める温かなピアノ。',
        'mood': 'town',
        'time': 'any',
        'duration': dur,
        'notes': notes
    }

    # --------------------------------------------------------------------------
    # Track 7: Wind Wanderer (風の巡礼) - G Minor / Minimal ambient
    # --------------------------------------------------------------------------
    dur = 26.0
    notes = [
        # Sustained G pedal
        (43, 0.0, 12.5, 0.20),   # G2
        (50, 1.0, 11.0, 0.14),   # D3
        (43, 13.0, 12.5, 0.20),  # G2
        (50, 14.0, 11.0, 0.14),  # D3
        # Minimalist repeating phrase with space
        (62, 2.0, 3.5, 0.18),    # D4
        (67, 3.8, 3.5, 0.19),    # G4
        (70, 5.5, 4.0, 0.20),    # Bb4
        (69, 8.5, 3.8, 0.17),    # A4
        (67, 10.5, 4.0, 0.18),   # G4
        (62, 15.0, 3.5, 0.18),   # D4
        (65, 16.8, 3.5, 0.17),   # F4
        (67, 18.5, 4.0, 0.19),   # G4
        (70, 21.5, 4.2, 0.20),   # Bb4
        (69, 23.5, 3.8, 0.17),   # A4
    ]
    tracks['track07_wind_wanderer'] = {
        'title': '風の巡礼',
        'title_en': 'Wind Wanderer',
        'desc': '砂埃と共に流れるミニマルな反復。思考を邪魔しない完全な環境音楽。',
        'mood': 'wasteland',
        'time': 'day',
        'duration': dur,
        'notes': notes
    }

    # --------------------------------------------------------------------------
    # Track 8: Horizon Dawn (夜明けの地平線) - D Major, gentle sunrise
    # --------------------------------------------------------------------------
    dur = 28.0
    notes = [
        # D - A/C# - Bm7 - G
        (38, 0.0, 6.5, 0.21),    # D2
        (45, 0.6, 5.5, 0.15),    # A2
        (50, 1.2, 5.0, 0.16),    # D3
        (37, 7.0, 6.5, 0.20),    # C#2
        (45, 7.6, 5.5, 0.15),    # A2
        (49, 8.2, 5.0, 0.16),    # C#3
        (35, 14.0, 6.5, 0.20),   # B1
        (42, 14.6, 5.5, 0.14),   # F#2
        (47, 15.2, 5.0, 0.15),   # B2
        (43, 21.0, 6.5, 0.21),   # G2
        (50, 21.6, 5.5, 0.15),   # D3
        (55, 22.2, 5.0, 0.16),   # G3
        # Dawn light melody
        (62, 2.0, 3.5, 0.18),    # D4
        (66, 3.6, 3.5, 0.19),    # F#4
        (69, 5.2, 4.0, 0.21),    # A4
        (64, 9.0, 3.2, 0.17),    # E4
        (69, 10.6, 3.8, 0.20),   # A4
        (66, 16.0, 3.5, 0.19),   # F#4
        (62, 17.8, 3.2, 0.17),   # D4
        (67, 22.8, 3.8, 0.20),   # G4
        (66, 24.6, 3.5, 0.18),   # F#4
        (62, 26.0, 4.0, 0.19),   # D4
    ]
    tracks['track08_dawn'] = {
        'title': '夜明けの地平線',
        'title_en': 'Horizon Dawn',
        'desc': '砂漠の朝。静かに昇る陽の光が大地を黄金色に染め上げていく。',
        'mood': 'dawn',
        'time': 'dawn',
        'duration': dur,
        'notes': notes
    }

    # --------------------------------------------------------------------------
    # Track 9: Vast Expanse (果てなき砂丘) - A Dorian open intervals
    # --------------------------------------------------------------------------
    dur = 30.0
    notes = [
        # Deep open fifths
        (33, 0.0, 9.0, 0.22),    # A1
        (40, 1.0, 8.0, 0.16),    # E2
        (47, 2.0, 7.0, 0.16),    # B2 (9th)
        (38, 10.0, 9.0, 0.21),   # D2
        (45, 11.0, 8.0, 0.16),   # A2
        (52, 12.0, 7.0, 0.15),   # E3
        (33, 20.0, 9.5, 0.22),   # A1
        (40, 21.0, 8.5, 0.16),   # E2
        # Sparse high notes across horizon
        (64, 4.0, 4.5, 0.18),    # E4
        (69, 6.5, 4.8, 0.20),    # A4
        (71, 8.0, 4.5, 0.19),    # B4
        (67, 13.5, 4.5, 0.18),   # G4
        (72, 15.5, 4.8, 0.20),   # C5
        (71, 17.5, 4.5, 0.19),   # B4
        (69, 23.5, 5.0, 0.20),   # A4
        (64, 26.0, 5.0, 0.17),   # E4
    ]
    tracks['track09_vast_expanse'] = {
        'title': '果てなき砂丘',
        'title_en': 'Vast Expanse',
        'desc': '360度見渡す限りの広野。果てしない空間の広がりを感じさせる音場。',
        'mood': 'wasteland',
        'time': 'day',
        'duration': dur,
        'notes': notes
    }

    # --------------------------------------------------------------------------
    # Track 10: Campfire Glow (焚き火の温もり) - E Dorian cozy acoustic
    # --------------------------------------------------------------------------
    dur = 28.0
    notes = [
        # Em7 - A7sus4 - Cmaj7 - Bm7
        (40, 0.0, 6.5, 0.20),    # E2
        (47, 0.6, 5.5, 0.15),    # B2
        (50, 1.2, 5.0, 0.16),    # D3
        (45, 7.0, 6.5, 0.20),    # A2
        (50, 7.6, 5.5, 0.15),    # D3
        (55, 8.2, 5.0, 0.16),    # G3
        (36, 14.0, 6.5, 0.21),   # C2
        (43, 14.6, 5.5, 0.15),   # G2
        (47, 15.2, 5.0, 0.16),   # B2
        (35, 21.0, 6.5, 0.19),   # B1
        (42, 21.6, 5.5, 0.14),   # F#2
        (47, 22.2, 5.0, 0.15),   # B2
        # Conversational warm piano
        (59, 2.0, 3.2, 0.17),    # B3
        (62, 3.4, 3.2, 0.18),    # D4
        (64, 5.0, 3.5, 0.19),    # E4
        (62, 9.0, 3.2, 0.18),    # D4
        (59, 10.6, 3.2, 0.16),   # B3
        (60, 16.0, 3.5, 0.18),   # C4
        (64, 17.5, 3.5, 0.19),   # E4
        (62, 23.0, 3.2, 0.17),   # D4
        (59, 24.8, 3.8, 0.18),   # B3
    ]
    tracks['track10_camp_fire'] = {
        'title': '焚き火の温もり',
        'title_en': 'Campfire Glow',
        'desc': 'パチパチと爆ぜる火を囲む夜。仲間たちとの無言の連帯感を紡ぐ。',
        'mood': 'camp',
        'time': 'night',
        'duration': dur,
        'notes': notes
    }

    # --------------------------------------------------------------------------
    # Track 11: Shimmering Haze (陽炎の彼方) - F# Minor floating modal
    # --------------------------------------------------------------------------
    dur = 28.0
    notes = [
        # F#m - Dmaj7 - Bm7 - C#m7
        (42, 0.0, 6.5, 0.21),    # F#2
        (49, 0.8, 5.5, 0.15),    # C#3
        (54, 1.4, 5.0, 0.16),    # F#3
        (38, 7.0, 6.5, 0.21),    # D2
        (45, 7.8, 5.5, 0.15),    # A2
        (50, 8.4, 5.0, 0.16),    # D3
        (35, 14.0, 6.5, 0.20),   # B1
        (42, 14.8, 5.5, 0.14),   # F#2
        (49, 15.4, 5.0, 0.15),   # C#3
        (37, 21.0, 6.5, 0.20),   # C#2
        (44, 21.8, 5.5, 0.14),   # G#2
        (49, 22.4, 5.0, 0.15),   # C#3
        # Shimmering floating motifs
        (66, 2.2, 3.5, 0.18),    # F#4
        (69, 3.8, 3.2, 0.17),    # A4
        (68, 5.2, 3.5, 0.18),    # G#4
        (66, 9.2, 3.5, 0.19),    # F#4
        (62, 11.0, 3.2, 0.16),   # D4
        (64, 16.2, 3.5, 0.18),   # E4
        (66, 17.8, 3.5, 0.19),   # F#4
        (61, 23.2, 3.5, 0.17),   # C#4
        (64, 25.0, 4.0, 0.18),   # E4
    ]
    tracks['track11_haze'] = {
        'title': '陽炎の彼方',
        'title_en': 'Shimmering Haze',
        'desc': '熱気で揺らめく午後の砂丘。時間が止まったかのような浮遊感。',
        'mood': 'wasteland',
        'time': 'day',
        'duration': dur,
        'notes': notes
    }

    # --------------------------------------------------------------------------
    # Track 12: Moonlight Sentry (月影の静寂) - C# Minor quiet vigil
    # --------------------------------------------------------------------------
    dur = 28.0
    notes = [
        # C#m - A - E - G#m
        (37, 0.0, 6.5, 0.20),    # C#2
        (44, 0.7, 5.5, 0.14),    # G#2
        (49, 1.3, 5.0, 0.15),    # C#3
        (33, 7.0, 6.5, 0.21),    # A1
        (40, 7.7, 5.5, 0.15),    # E2
        (45, 8.3, 5.0, 0.16),    # A2
        (40, 14.0, 6.5, 0.20),   # E2
        (47, 14.7, 5.5, 0.14),   # B2
        (52, 15.3, 5.0, 0.15),   # E3
        (32, 21.0, 6.5, 0.19),   # G#1
        (39, 21.7, 5.5, 0.14),   # D#2
        (44, 22.3, 5.0, 0.15),   # G#2
        # Delicate night thoughts
        (61, 2.0, 3.5, 0.18),    # C#4
        (64, 3.6, 3.2, 0.17),    # E4
        (68, 5.2, 3.8, 0.19),    # G#4
        (64, 9.0, 3.2, 0.17),    # E4
        (61, 10.6, 3.2, 0.16),   # C#4
        (68, 16.0, 3.5, 0.19),   # G#4
        (64, 17.6, 3.2, 0.17),   # E4
        (63, 23.0, 3.5, 0.17),   # D#4
        (59, 24.8, 4.0, 0.16),   # B3
        (61, 26.2, 4.2, 0.18),   # C#4
    ]
    tracks['track12_moonlight'] = {
        'title': '月影の静寂',
        'title_en': 'Moonlight Sentry',
        'desc': '物見台から望む砂漠の深夜。静寂を破ることなく優しく響くピアノ。',
        'mood': 'night',
        'time': 'night',
        'duration': dur,
        'notes': notes
    }

    return tracks

def main():
    print(f"Generating 12 piano tracks into {OUT}...")
    synth = PianoSynth(sr=SR, seed=20261102)
    tracks_data = get_track_data()
    manifest = {
        "version": "1.0.0",
        "sampleRate": SR,
        "format": "m4a (aac 64k stereo)",
        "tracks": {}
    }

    for track_id, info in tracks_data.items():
        print(f"Rendering {track_id} ({info['title']})...")
        left, right = render_track(synth, info['notes'], total_seconds=info['duration'], wind_gain=0.007)
        saved_info = save_m4a(track_id, left, right, sr=SR)
        manifest["tracks"][track_id] = {
            "id": track_id,
            "title": info["title"],
            "title_en": info["title_en"],
            "desc": info["desc"],
            "mood": info["mood"],
            "time": info["time"],
            "duration": info["duration"],
            "file": saved_info["file"],
            "size_kb": saved_info["size_kb"],
            "sha256": saved_info["sha256"]
        }

    manifest_path = OUT / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"Manifest written to {manifest_path}")
    print("Done! All 12 ambient piano tracks generated successfully.")

if __name__ == "__main__":
    main()
