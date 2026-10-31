// 仮箱の見た目だけを定義する。sim の部品表や状態から独立させ、後で置き換えやすくする。
export const BUILD_LOOKS = Object.freeze({
  outpost_flag: { size:[0.8,2.2,0.8], color:'#c7a96b' },
  wood_fence: { size:[1,1.8,0.35], color:'#795c40' },
  stone_wall: { size:[1,2.4,0.55], color:'#85827d' },
  wood_gate: { size:[1,2,0.35], color:'#a77c4d' },
  storage_box: { size:[1.2,1,0.8], color:'#956c42' },
  bedroll: { size:[1.6,0.2,0.7], color:'#8b7864' },
  bed: { size:[2,0.7,1], color:'#947f67' },
  workbench: { size:[1.6,1.1,1], color:'#806247' },
  small_farm: { size:[3,0.4,3], color:'#71824d' },
  shop_counter: { size:[1.8,1,0.6], color:'#ad8451' },
  forge: { size:[1.5,1.2,1.5], color:'#716c68' },
  owned_house: { size:[6,4,6], color:'#9a866b' },
  owned_house_wall: { size:[1,2.6,1], color:'#9a866b' },
  owned_house_floor: { size:[1,0.08,1], color:'#7b6a55' },
  owned_house_door: { size:[1,2.1,1], color:'#5e4630' },
  remote_outpost: { size:[1.2,1.6,1.2], color:'#d1b05d' },
});

export function buildLook(type) {
  const look = BUILD_LOOKS[type] || BUILD_LOOKS.storage_box;
  return { size:[...look.size], color:look.color };
}
