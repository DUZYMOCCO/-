// 文字の大きさはワールド座標、帯の位置は画面の px。拡大率を二重に掛けない。
export function popMinY(camY, screenHeight, zoom, topPx, textHeight) {
  const z = zoom || 1;
  return camY - screenHeight / 2 / z + topPx / z + Math.abs(textHeight) / 2;
}
