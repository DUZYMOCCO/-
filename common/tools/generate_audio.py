"""Reproducible original PCM: modal impacts, noisy transients and plucked strings.
No external recordings, network dependencies or licensed sample packs.
python common/tools/generate_audio.py
"""
from pathlib import Path
import json, wave, hashlib
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'common'/'assets'/'audio'
SR=22050
RNG=np.random.default_rng(260108)
def timeline(seconds):return np.arange(round(seconds*SR))/SR
def noise(seconds,decay=12,smooth=1):
 t=timeline(seconds);x=RNG.normal(0,1,len(t))
 if smooth>1:x=np.convolve(x,np.ones(smooth)/smooth,mode='same')*np.sqrt(smooth)
 return x*np.exp(-t*decay)*(1-np.exp(-t*1100))
def modes(seconds,frequencies,decay=8):
 t=timeline(seconds);x=np.zeros(len(t))
 for i,f in enumerate(frequencies):x+=np.sin(2*np.pi*f*t+RNG.uniform(-.12,.12))*np.exp(-t*decay*(1+i*.32))/(1+i)**1.3
 return x*(1-np.exp(-t*1800))
def pluck(freq,seconds=2.3):
 n=round(seconds*SR);period=max(2,round(SR/freq));x=np.zeros(n);x[:period]=RNG.uniform(-1,1,period)
 for i in range(period,n):x[i]=.496*(x[i-period]+x[i-period+1])
 return x*np.exp(-timeline(seconds)*.75)
def add(dest,source,start,gain=1):
 i=round(start*SR);n=min(len(source),len(dest)-i)
 if n>0:dest[i:i+n]+=source[:n]*gain
def finish(x,peak=.72):
 x=np.asarray(x,dtype=float);x-=np.mean(x,axis=0)
 # Short anti-click fades; saturate transient outliers gently before normalizing.
 x=np.tanh(x);length=min(100,len(x)//8);fade=np.linspace(0,1,length)
 if x.ndim==2:fade=fade[:,None]
 x[:length]*=fade;x[-length:]*=fade[::-1]
 level=np.max(np.abs(x));return x*(peak/max(level,1e-9))
def save(name,x,peak=.72):
 x=finish(x,peak);path=OUT/f'{name}.wav';channels=1 if x.ndim==1 else x.shape[1]
 with wave.open(str(path),'wb') as w:w.setnchannels(channels);w.setsampwidth(2);w.setframerate(SR);w.writeframes((x*32767).astype('<i2').tobytes())
 return {'file':path.name,'seconds':round(len(x)/SR,3),'channels':channels,'peak':round(float(np.max(np.abs(x))),4),'rms':round(float(np.sqrt(np.mean(x*x))),4),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
def whoosh(seconds=.24):
 t=timeline(seconds);x=RNG.normal(0,1,len(t));low=np.convolve(x,np.ones(6)/6,mode='same')
 return (x-low)*np.sin(np.pi*t/seconds)**2*.48

def generate():
 OUT.mkdir(parents=True,exist_ok=True);clips={}
 clips['tap']=noise(.065,75,3)+modes(.065,[180,410,780],55)*.22
 clips['hit']=noise(.24,22,12)*.65+modes(.24,[92,148,237],19)*.7
 clips['metal']=noise(.38,35,2)*.3+modes(.38,[390,639,1048,1517,2130,2781],9)*.7
 clips['slash']=whoosh(.24)+modes(.24,[720,1211,1849],30)*.08
 clips['hammer']=noise(.45,18,22)*.8+modes(.45,[72,117,182,442,753],13)*.7
 string=pluck(190,.4);clips['bow']=string*.8+noise(.4,32,4)*.16
 latch=pluck(245,.3);clips['crossbow']=latch*.55+noise(.3,47,2)*.45+modes(.3,[210,610],30)*.15
 clips['cannon']=noise(.95,8,16)*.9+modes(.95,[54,81,128,191],6)*.65+noise(.95,22,2)*.15
 clips['stone']=whoosh(.18)*.6+noise(.18,26,10)*.25
 clips['heal']=modes(.85,[294,440,587,882,1174],4.8)*.7+noise(.85,10,14)*.04
 clips['coin']=modes(.32,[1330,1911,2749],19)*.35+noise(.32,70,2)*.25
 clips['fire']=noise(.65,9,7)*.85+noise(.65,17,2)*.12+modes(.65,[110,187],12)*.2
 clips['ice']=modes(.65,[612,958,1433,2057,3019],12)*.5+noise(.65,15,2)*.25
 bolt=noise(.68,9,11)*.8+modes(.68,[76,127,223],8)*.4
 for at in [0,.025,.07]:add(bolt,noise(.09,65,1),at,.4)
 clips['lightning']=bolt
 clips['blast']=noise(1.15,6,18)*1.1+modes(1.15,[49,88,145,219],5)*.7+noise(1.15,17,2)*.2
 clips['down']=noise(.7,16,15)*.75+modes(.7,[87,171,447,689],11)*.35
 reward=np.zeros(round(1.6*SR))
 for at,f in [(0,294),(.12,370),(.26,440),(.4,587)]:add(reward,modes(.9,[f,f*2.01,f*2.76],5),at,.28)
 clips['reward']=reward
 defeat=np.zeros(round(2.2*SR))
 for at,f in [(0,196),(.35,174.6),(.75,146.8)]:add(defeat,pluck(f,1.35),at,.5)
 clips['defeat']=defeat
 manifest={name:save(name,x) for name,x in clips.items()}
 # Eight quiet bars: lute ostinato, bowed-string bed, hand drum and wind.
 beat=60/72;bar=beat*4;duration=bar*8;n=round(duration*SR);left=np.zeros(n);right=np.zeros(n)
 roots=[146.83,146.83,116.54,174.61,130.81,146.83,116.54,130.81]
 cached={}
 for b,root in enumerate(roots):
  start=b*bar;t=timeline(bar+.8);envelope=np.sin(np.pi*np.minimum(t/(bar+.8),1))**1.3
  pad=np.zeros(len(t))
  for ratio in [1,1.5,2]:
   phase=2*np.pi*root*ratio*t+.004*root*np.sin(2*np.pi*4.7*t)
   for h in range(1,6):pad+=np.sin(phase*h)/(h*h)*(.14 if ratio==1 else .08)
  pad*=envelope
  add(left,pad,start,.7);add(right,pad,start,.82)
  pattern=[1,1.5,2,1.5]
  for step,ratio in enumerate(pattern):
   key=round(root*ratio,3)
   if key not in cached:cached[key]=pluck(key,2.3)
   at=start+step*beat;add(left,cached[key],at,.22 if step%2 else .3);add(right,cached[key],at,.29 if step%2 else .22)
  for step in [0,2]:
   drum=modes(.45,[67,108,167],11)*.6+noise(.45,30,17)*.2
   add(left,drum,start+step*beat,.23);add(right,drum,start+step*beat,.2)
  add(left,noise(.16,23,4),start+3*beat,.07);add(right,noise(.16,23,4),start+3*beat,.09)
 wind=RNG.normal(0,1,n);wind=np.convolve(wind,np.ones(120)/120,mode='same')
 left+=wind*.3;right+=np.roll(wind,round(.03*SR))*.3
 music=np.stack([left,right],axis=1)
 # Join both ends at the same sample, preserving the loop's ambience.
 edge=round(.35*SR);blend=np.linspace(0,1,edge)[:,None]
 music[-edge:]=music[-edge:]*(1-blend)+music[:edge]*blend
 music=finish(music,.66);music[-1]=music[0]
 # Avoid re-fading the loop in save(): PCM is already normalized.
 path=OUT/'music.wav'
 with wave.open(str(path),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((music*32767).astype('<i2').tobytes())
 manifest['music']={'file':'music.wav','seconds':round(n/SR,3),'channels':2,'peak':round(float(np.max(np.abs(music))),4),'rms':round(float(np.sqrt(np.mean(music*music))),4),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 (OUT/'manifest.json').write_text(json.dumps({'sampleRate':SR,'origin':'original procedural physical-style PCM','clips':manifest},ensure_ascii=False,indent=2),encoding='utf-8')
 # Standalone audition: score under real in-game sample files.
 demo=music[:round(12*SR)].copy()*.45
 for name,at in [('slash',1),('metal',1.3),('bow',2.8),('hit',3.2),('cannon',4.5),('fire',6),('ice',7.2),('lightning',8.5),('heal',10)]:
  with wave.open(str(OUT/f'{name}.wav')) as w:pcm=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768
  add(demo,np.stack([pcm,pcm],axis=1),at,.65)
 save('preview',demo,.82)
 print(f'Generated {len(manifest)} original WAV assets + preview; {sum(p.stat().st_size for p in OUT.glob("*.wav"))/1024/1024:.2f} MiB')
if __name__=='__main__':generate()
