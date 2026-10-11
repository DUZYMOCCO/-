// v5.0.0: 自小隊（直属・限定仲間の同行含む）だけに付く足元のリング。本隊/門番/商人護衛/民間人には付けない。
export const isOwnSquad = s => !!s && !s.dead && (!!s.isPersonalGuard || !!s.overflowGuard);

/** ctx は呼び出し側で世界座標系。スプライトより先に描く（足元）。割り当てなし・文字なし。 */
export function drawOwnSquadRing(c, s) {
  if (!isOwnSquad(s)) return false;
  const down = !!s.isDown, rx = down ? 19 : 15, ry = down ? 6.4 : 5;
  c.save();
  c.translate(s.x + 1, s.y + 4);
  c.beginPath();
  c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = 'rgba(251,191,36,0.13)';
  c.fill();
  c.lineWidth = down ? 2.8 : 1.7;
  c.strokeStyle = down ? 'rgba(253,224,71,0.85)' : 'rgba(251,191,36,0.66)';
  c.stroke();
  c.restore();
  return true;
}
