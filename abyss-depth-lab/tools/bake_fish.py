"""ABYSS DIVE: bake side-on fish swim strips (Pillow, no source artwork)."""
import math as m
from pathlib import Path
from typing import cast
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'assets'
S = 2
FRAMES = 8
CELL = (368, 304)
ORIGIN = (168, 76)

def bez(points):
    a,b,c,d = points
    return [tuple((1-t)**3*a[i]+3*t*(1-t)**2*b[i]+3*t*t*(1-t)*c[i]+t**3*d[i] for i in (0,1)) for t in (j/15 for j in range(16))]

def sprite(kind, phase, jaw: float=0):
    big = kind == 'angler'; small = kind == 'minnow'
    L,H = (128,46) if big else (54,20)
    im = Image.new('RGBA', CELL); draw = ImageDraw.Draw(im)
    ox,oy = ORIGIN
    def xy(p): return ((p[0]+ox)*S,(p[1]+oy)*S)
    def poly(p,col): draw.polygon(list(map(xy,p)), fill=col)
    def line(p,col,w: float=1): draw.line(list(map(xy,p)),fill=col,width=max(1,round(w*S)))
    def oval(x,y,rx,ry,c): draw.ellipse([xy((x-rx,y-ry)),xy((x+rx,y+ry))],fill=c)
    def wig(u): return m.sin(4.4*u-phase)*L*.045*u**1.8
    def fin(a,b,c,d, shade, membrane: float=0):
        edge = bez((a,b,c,d))
        return_edge = bez((d, (d[0]-4, d[1]+membrane), (a[0]-9, a[1]+membrane), a))
        poly(edge+return_edge,shade)
        for j in range(2,14,2):
            mid = edge[j]; line([a,((a[0]+mid[0])/2-2,(a[1]+mid[1])/2),mid],tuple(min(255,v+15+j*2) for v in shade),.55)
        line(edge[3:13],tuple(v+22 for v in shade),.65)
    rear=wig(1); spread=(.83+.17*m.cos(phase)); tail=34 if not small else 23
    base = (40,46,52) if small else ((59,38,48) if big else (71,41,45));
    a=(-L+9,rear)
    fin(a,(-L-tail*.69,rear-H*.54),(-L-tail,rear-H*1.54*spread),(-L-tail*.84,rear-H*1.14*spread),base,H*.23)
    fin(a,(-L-tail*.55,rear+H*.43),(-L-tail,rear+H*1.48*spread),(-L-tail*.80,rear+H*1.1*spread),base,-H*.23)
    fins = [( .60,1.18)] if small else ([(.34,1.34),(.48,1.45),(.62,1.32),(.75,1.13)] if big else [(.34,1.44),(.60,1.13)])
    for u, ht in fins:
        x=-L*u; y=wig(u)
        fin((x+L*.13,y-H*.49),(x+L*.08,y-H*.81),(x-L*.17,y-H*ht),(x-L*.21,y-H*.43),base)
    px=im.load()
    assert px is not None
    # Reconstruct the visible half of an elliptical cross-section, then add scale relief and maculation.
    colors = ((19,28,39),(65,86,88),(163,169,147)) if small else (((31,23,38),(96,59,56),(170,130,107)) if big else ((24,27,41),(94,58,61),(174,136,107)))
    for ix in range(int((ox-L)*S),ox*S+1):
        x=ix/S-ox; u=max(.001,min(.999,-x/L)); p=m.sin(m.pi*u**.72)*H*(1-.28*u); cy=wig(u)
        if p<.3: continue
        for iy in range(round((oy+cy-p)*S),round((oy+cy+p)*S)+1):
            y=iy/S-oy; q=(y-cy)/p; alpha=round(255*max(0,min(1,(p-abs(y-cy))*S+.45)))
            if not alpha: continue
            z=m.sqrt(max(0,1-q*q)); key=max(0,min(1,.24+.53*z-.32*q));
            scale=3.4 if big else 2.1; row=m.floor(y/scale); sx=((x/scale+row*.5)%1)-.5; sy=(y/scale)%1-.44
            scales=m.exp(-40*(m.sqrt((sx*.9)**2+(sy*.78)**2)-.30)**2)*(.65+.35*m.sin(x*1.12+y*.7))
            mottles=m.sin(x*.19+y*.23)*m.cos(y*.43-x*.09)+.53*m.sin(x*.66+y*.89)+.13*m.sin(ix*17.17+iy*31.14)
            v=max(0,min(.98,key+.12*mottles-.15*scales*(.3+.7*u)))
            lo,hi,t=(colors[0],colors[1],v/.55) if v<.55 else (colors[1],colors[2],(v-.55)/.45)
            rgb=tuple(round(lo[j]+(hi[j]-lo[j])*t) for j in range(3))
            prev=cast(tuple[int,int,int,int],px[ix,iy]); out_a=alpha+prev[3]*(255-alpha)/255
            px[ix,iy]=tuple(round((rgb[j]*alpha+prev[j]*prev[3]*(255-alpha)/255)/out_a) for j in range(3))+(round(out_a),)
    # Paired fin and gill folds follow the body surface, rather than outlining it.
    u=.34 if not big else .49; x=-L*u; y=wig(u)
    fin((x+L*.08,y+H*.05),(x-L*.12,y+H*.02),(x-L*.35,y+H*.98),(x-L*.28,y+H*.57),base)
    for j in range(2 if small else 3):
        x=-(.23+.044*j)*L if not big else -(.45+.033*j)*L
        line(bez(((x,-H*.32),(x-L*.06,-H*.12),(x-L*.07,H*.12),(x-L*.03,H*.36))),(38,34,43) if not small else (35,48,56),1.1 if big else .7)
    ex,ey = (-70,-H*.4) if big else (-12,-H*.32)
    er = 6.9 if big else (2.8 if small else 4.8)
    oval(ex,ey,er*1.4,er*1.10,(48,33,38) if not small else (32,46,52))
    oval(ex+.4,ey,er,er*.78,(202,127,63) if not small else (163,160,111))
    oval(ex+er*.30,ey,er*.47,er*.63,(15,25,29))
    oval(ex-er*.20,ey-er*.22,er*.23,er*.19,(240,220,173))
    if not small:
        x1=-52 if big else -16; reach=18 if big else 5
        upper=bez(((1,0),(-7,reach+2),(x1*.6,reach+2),(x1,reach-2)))
        if big:
            lower=bez(((x1,reach-2),(-33,reach+8+jaw*18),(-4,6+jaw*24),(1,2+jaw*17)))
            poly(upper+lower,(37,22,31)); line(lower,(112,72,64),3.3)
        else: line(upper,(35,21,30),2.3)
        for j in range(6 if big else 2):
            x=-4-j*(7.2 if big else 4.1); y=reach*m.sin(min(1,-x/-x1)*2.1)
            poly(bez(((x+2,y-1),(x+2,y+4),(x-.5,y+7-(j%3)),(x-2,y-1))), (185-j*5,166-j*4,137-j*3))
    return im

for kind in ('minnow','hunter','angler'):
    jaws = 4 if kind == 'angler' else 1
    strip = Image.new('RGBA',(CELL[0]*FRAMES,CELL[1]*jaws))
    for j in range(jaws):
        for i in range(FRAMES): strip.paste(sprite(kind,i*m.tau/FRAMES,j/max(1,jaws-1)),(i*CELL[0],j*CELL[1]))
    strip.save(OUT/f'fish-{kind}-swim.webp',lossless=True,method=6)
