// 鍛冶素材データおよび古代研究遺物データ
// inputs/Q2_ruins.json および inputs/Q1_ruins.json から生成

export const SMITH_MATERIALS = Object.freeze(Object.fromEntries(
  [
  {
    "id": "scrap_iron",
    "name": "鉄くず",
    "origName": "Scrap Iron",
    "description": "廃材から回収された金属くず。初歩的な鍛錬に使える。",
    "rarity": "common",
    "materialRank": 1,
    "upgrade_effect": "攻撃力+1、耐久向上",
    "enables": "粗悪武器の修繕",
    "stats": {
      "atkBonus": 1,
      "defBonus": 0,
      "dmgBonus": 0.02,
      "weightMod": 0.1,
      "rankBonus": 0
    },
    "value": 15,
    "weight": 0.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "iron_plate",
    "name": "鉄板",
    "origName": "Iron Plate",
    "description": "延ばされた純度の高い鉄板。武器の補強に適する。",
    "rarity": "common",
    "materialRank": 2,
    "upgrade_effect": "攻撃力+1、防御+1、耐久向上",
    "enables": "標準武器の鍛錬",
    "stats": {
      "atkBonus": 1,
      "defBonus": 1,
      "dmgBonus": 0.05,
      "weightMod": -0.1,
      "rankBonus": 0
    },
    "value": 40,
    "weight": 1,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "steel_bar",
    "name": "鋼材",
    "origName": "Steel Bar",
    "description": "鍛え上げられた良質な鋼。剛性と粘りを兼ね備える。",
    "rarity": "uncommon",
    "materialRank": 4,
    "upgrade_effect": "攻撃力+2、防御+1、切断+10%、重さ-0.3kg",
    "enables": "上質武器の鍛錬",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.1,
      "weightMod": -0.3,
      "rankBonus": 0
    },
    "value": 110,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "ancient_alloy_plate",
    "name": "古代の耐熱合金板",
    "origName": "Desert Heatplate",
    "description": "鍛造された古代合金で、厳しい砂漠の環境で溶けた水脈から生成される。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "剣 R7以上を製造可能、品質ランク+1、切断+15%、重さ-0.5kg、耐久+25%",
    "enables": "剣 R7以上",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "cracked_obsidian_shard",
    "name": "黒曜石の鋭利な破片",
    "origName": "Fissure Shard",
    "description": "滅びた砂漠都市の床下から見つかる、鋭い切り口を持つ透明な破片。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "クロスボウの弦を製造可能、強度+20%、耐久+30%、重さ+0.2kg",
    "enables": "クロスボウの弦",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "burnt_crystal_fragment",
    "name": "焦熱のプリズム結晶",
    "origName": "Scorched Prism",
    "description": "古代遺跡で発見される、日光に晒されて鋭くなった透明な破片。",
    "rarity": "legendary",
    "materialRank": 10,
    "upgrade_effect": "槍 R8以上を製造可能、貫通+25%、重さ-0.8kg、耐久+35%",
    "enables": "槍 R8以上",
    "stats": {
      "atkBonus": 4,
      "defBonus": 2,
      "dmgBonus": 0.35,
      "weightMod": -1,
      "rankBonus": 2
    },
    "value": 1000,
    "weight": 2.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "sandstone_gear_piece",
    "name": "砂風化の歯車",
    "origName": "Dune Gear",
    "description": "古代機械の歯車の一部で、砂漠の風化の中で完璧な形に磨かれた。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "大釜を製造可能、調理効率+15%、重さ-1.0kg、耐久+20%",
    "enables": "大釜",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "magma_glazed_pottery",
    "name": "溶岩釉薬の陶片",
    "origName": "Volcanic Glaze",
    "description": "溶岩の川を流れる中で見つかる、鮮やかな赤色に焼かれた陶器。",
    "rarity": "uncommon",
    "materialRank": 4,
    "upgrade_effect": "壷を製造可能、純水保持+10%、重さ-0.3kg、耐久+15%",
    "enables": "壷",
    "stats": {
      "atkBonus": 1,
      "defBonus": 1,
      "dmgBonus": 0.1,
      "weightMod": -0.2,
      "rankBonus": 0
    },
    "value": 140,
    "weight": 0.8,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "salt_crusted_swordblade",
    "name": "塩化の古刃",
    "origName": "Marauder Blade",
    "description": "古代の戦士の武器で、塩の地層に埋められていた。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "刀を製造可能、斬撃+20%、重さ-0.7kg、耐久+30%",
    "enables": "刀",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "desert_wyrm_scale",
    "name": "砂竜の灼熱鱗",
    "origName": "Sun-Scorched Scale",
    "description": "砂漠に生息する古代の龍の鱗で、日光に当てられて輝く。",
    "rarity": "legendary",
    "materialRank": 10,
    "upgrade_effect": "鎧を製造可能、防護+30%、重さ+0.5kg、耐久+40%",
    "enables": "鎧",
    "stats": {
      "atkBonus": 4,
      "defBonus": 2,
      "dmgBonus": 0.35,
      "weightMod": -1,
      "rankBonus": 2
    },
    "value": 1000,
    "weight": 2.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "coated_arrowshead",
    "name": "研磨された鏃",
    "origName": "Sand-Blast Arrowhead",
    "description": "弓の矢を強化するために砂漠で発見される、滑らかな矢じり。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "矢を製造可能、命中+10%、空気抵抗-5%、重さ-0.2kg",
    "enables": "矢",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "ancient_brazier_remnant",
    "name": "古代の篝火残滓",
    "origName": "Scorched Brazier",
    "description": "古代の灯台の残骸で、光る樹液の痕跡が残っている。",
    "rarity": "uncommon",
    "materialRank": 4,
    "upgrade_effect": "ランプを製造可能、明るさ+20%、燃焼時間+25%、重さ-0.4kg",
    "enables": "ランプ",
    "stats": {
      "atkBonus": 1,
      "defBonus": 1,
      "dmgBonus": 0.1,
      "weightMod": -0.2,
      "rankBonus": 0
    },
    "value": 140,
    "weight": 0.8,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "desert_fossilized_wood",
    "name": "砂漠の珪化木",
    "origName": "Time-Worn Log",
    "description": "古代の樹木の化石で、砂漠の岩層から掘り出される。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "釣竿を製造可能、感度+15%、重さ-0.6kg、耐久+20%",
    "enables": "釣竿",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "spike_broken_shield",
    "name": "棘付き破砕盾片",
    "origName": "Barbed Shield",
    "description": "古代の戦士の盾で、壊れた状態のまま地層に埋められていた。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "盾を製造可能、防護+15%、重さ-0.3kg、耐久+25%",
    "enables": "盾",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "ancient_mechanism_spring",
    "name": "古代機構のぜんまい",
    "origName": "Desert Spring",
    "description": "古代時計の張力装置で、砂漠の環境で完璧に機能する。",
    "rarity": "legendary",
    "materialRank": 10,
    "upgrade_effect": "機械装置を製造可能、作動安定性+30%、重さ+0.8kg、耐久+40%",
    "enables": "機械装置",
    "stats": {
      "atkBonus": 4,
      "defBonus": 2,
      "dmgBonus": 0.35,
      "weightMod": -1,
      "rankBonus": 2
    },
    "value": 1000,
    "weight": 2.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "buried_gold_bar",
    "name": "砂に埋もれた金塊",
    "origName": "Sun-Beaten Bar",
    "description": "古代の宝物の地層で見つかる、溶けた状態で保存された金。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "壷を製造可能、純金級純度+5%、重さ-0.2kg、耐久+10%",
    "enables": "壷",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "cracked_ancient_runestone",
    "name": "刻印入りの古代石片",
    "origName": "Eternal Glyph",
    "description": "古代の遺跡で発見される、意味不明な文字が刻まれた石。",
    "rarity": "legendary",
    "materialRank": 10,
    "upgrade_effect": "呪文書を製造可能、魔法効果+20%、重さ-0.5kg、耐久+35%",
    "enables": "呪文書",
    "stats": {
      "atkBonus": 4,
      "defBonus": 2,
      "dmgBonus": 0.35,
      "weightMod": -1,
      "rankBonus": 2
    },
    "value": 1000,
    "weight": 2.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "sand_etched_crystal",
    "name": "砂刻の蜃気楼水晶",
    "origName": "Mirage Crystal",
    "description": "砂漠の風で磨かれた透明な結晶で、歪んだ光を放つ。",
    "rarity": "uncommon",
    "materialRank": 4,
    "upgrade_effect": "鏡を製造可能、反射率+15%、重さ-0.1kg、耐久+15%",
    "enables": "鏡",
    "stats": {
      "atkBonus": 1,
      "defBonus": 1,
      "dmgBonus": 0.1,
      "weightMod": -0.2,
      "rankBonus": 0
    },
    "value": 140,
    "weight": 0.8,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "desert_algae_fiber",
    "name": "砂漠藻の強靭繊維",
    "origName": "Dune Fiber",
    "description": "砂漠の湿地帯で発見される、細く丈夫な植物繊維。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "縄を製造可能、強度+10%、重さ-0.4kg、耐久+20%",
    "enables": "縄",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "ancient_forge_remnant",
    "name": "古代鍛冶炉の耐火材",
    "origName": "Smelter Remains",
    "description": "古代の鍛冶場の残骸で、独特の構造を保っている。",
    "rarity": "legendary",
    "materialRank": 10,
    "upgrade_effect": "炉を製造可能、 smelting_efficiency+25%、重さ+1.0kg、耐久+35%",
    "enables": "炉",
    "stats": {
      "atkBonus": 4,
      "defBonus": 2,
      "dmgBonus": 0.35,
      "weightMod": -1,
      "rankBonus": 2
    },
    "value": 1000,
    "weight": 2.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "bandit_armour_fragment",
    "name": "古戦士の重装甲片",
    "origName": "Rusted Battleplate",
    "description": "古代の戦士の鎧の破片で、砂漠の盗賊の跡がある。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "鎧を製造可能、防護+20%、重さ-0.6kg、耐久+30%",
    "enables": "鎧",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "ancient_scroll_fragment",
    "name": "古代の失伝記録片",
    "origName": "Lost Knowledge",
    "description": "砂漠の廃墟で発見される、古代の巻物の破片。",
    "rarity": "uncommon",
    "materialRank": 4,
    "upgrade_effect": "書物を製造可能、知恵効果+10%、重さ-0.3kg、耐久+15%",
    "enables": "書物",
    "stats": {
      "atkBonus": 1,
      "defBonus": 1,
      "dmgBonus": 0.1,
      "weightMod": -0.2,
      "rankBonus": 0
    },
    "value": 140,
    "weight": 0.8,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "desert_beast_tusk",
    "name": "砂漠巨獣の牙",
    "origName": "Broken Tusk",
    "description": "砂漠に生息する古代の獣の牙で、砂に埋まっていた。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "槍を製造可能、貫通+20%、重さ-0.7kg、耐久+30%",
    "enables": "槍",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "burnt_civilisation_artifact",
    "name": "倒壊記念碑の巨石片",
    "origName": "Collapsed Monument",
    "description": "古代文明の記念碑の破片で、崩壊した都市の跡から見つかる。",
    "rarity": "legendary",
    "materialRank": 10,
    "upgrade_effect": "像を製造可能、威信効果+30%、重さ+2.0kg、耐久+50%",
    "enables": "像",
    "stats": {
      "atkBonus": 4,
      "defBonus": 2,
      "dmgBonus": 0.35,
      "weightMod": -1,
      "rankBonus": 2
    },
    "value": 1000,
    "weight": 2.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "salt_mine_crystal",
    "name": "岩塩鉱の硬質結晶",
    "origName": "Halite Crystal",
    "description": "塩の鉱山で発見される、透明な結晶で砂漠の空気に晒される。",
    "rarity": "uncommon",
    "materialRank": 4,
    "upgrade_effect": "板を製造可能、硬度+10%、重さ-0.2kg、耐久+15%",
    "enables": "板",
    "stats": {
      "atkBonus": 1,
      "defBonus": 1,
      "dmgBonus": 0.1,
      "weightMod": -0.2,
      "rankBonus": 0
    },
    "value": 140,
    "weight": 0.8,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "ancient_forge_wheel",
    "name": "古代鍛冶場の大輪車片",
    "origName": "Broken Wheel",
    "description": "古代の鍛冶場に残された壊れた木製の大輪車。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "粉砕機を製造可能、処理速度+15%、重さ+0.5kg、耐久+25%",
    "enables": "粉砕機",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "desert_water_carving",
    "name": "湧水彫刻の石片",
    "origName": "Oasis Sculpture",
    "description": "砂漠のオアシスで発見される、水で彫られた古代の彫刻。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "壷を製造可能、水保持効果+25%、重さ-0.4kg、耐久+30%",
    "enables": "壷",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "ancient_brazier_mechanism",
    "name": "太陽集光機構",
    "origName": "Solar Furnace",
    "description": "古代の灯台の機構で、太陽の光を集めて照明に利用する。",
    "rarity": "legendary",
    "materialRank": 10,
    "upgrade_effect": "ランプを製造可能、夜間視力+15%、重さ-0.5kg、耐久+35%",
    "enables": "ランプ",
    "stats": {
      "atkBonus": 4,
      "defBonus": 2,
      "dmgBonus": 0.35,
      "weightMod": -1,
      "rankBonus": 2
    },
    "value": 1000,
    "weight": 2.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "sand_worn_sword_edge",
    "name": "風化を耐えた古剣先",
    "origName": "Worn Blade",
    "description": "砂漠の廃墟で発見される、古代の剣の切れ味の良い部分。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "刀を製造可能、斬撃+25%、重さ-0.8kg、耐久+35%",
    "enables": "刀",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "desert_wind_chimes",
    "name": "砂嵐の共鳴鈴片",
    "origName": "Sand-Stirrup Chimes",
    "description": "砂漠の風に揺れる、古代の金属製のチャイム。",
    "rarity": "uncommon",
    "materialRank": 4,
    "upgrade_effect": "鈴を製造可能、音色+10%、重さ-0.1kg、耐久+10%",
    "enables": "鈴",
    "stats": {
      "atkBonus": 1,
      "defBonus": 1,
      "dmgBonus": 0.1,
      "weightMod": -0.2,
      "rankBonus": 0
    },
    "value": 140,
    "weight": 0.8,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "ancient_pottery_sherd",
    "name": "古代の頑丈な壺片",
    "origName": "Cracked Urn",
    "description": "古代の壷の破片で、砂漠の砂に埋まっていた。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "壷を製造可能、水保持+15%、重さ-0.3kg、耐久+20%",
    "enables": "壷",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "buried_sunstone",
    "name": "埋もれた太陽石",
    "origName": "Sunstone Fragment",
    "description": "古代の宝物の埋葬場所で見つかる、日光を集めた石。",
    "rarity": "legendary",
    "materialRank": 10,
    "upgrade_effect": "神器を製造可能、神聖効果+40%、重さ+3.0kg、耐久+60%",
    "enables": "神器",
    "stats": {
      "atkBonus": 4,
      "defBonus": 2,
      "dmgBonus": 0.35,
      "weightMod": -1,
      "rankBonus": 2
    },
    "value": 1000,
    "weight": 2.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "ancient_metal_brace",
    "name": "古代機械の関節留め具",
    "origName": "Gear Brace",
    "description": "古代機械の関節用ブラケットで、砂漠の風化の中で完璧な形に磨かれた。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "ベルトを製造可能、強度+12%、重さ-0.3kg、耐久+20%",
    "enables": "ベルト",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "desert_crystal_torch",
    "name": "古代の結晶灯具",
    "origName": "Sunlight Torch",
    "description": "砂漠の遺跡で発見される、古代の照明器具。",
    "rarity": "uncommon",
    "materialRank": 4,
    "upgrade_effect": "松明を製造可能、明るさ+18%、燃焼時間+20%、重さ-0.2kg",
    "enables": "松明",
    "stats": {
      "atkBonus": 1,
      "defBonus": 1,
      "dmgBonus": 0.1,
      "weightMod": -0.2,
      "rankBonus": 0
    },
    "value": 140,
    "weight": 0.8,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "buried_stone_wheel",
    "name": "埋もれた研磨砥石片",
    "origName": "Broken Grinder",
    "description": "古代の錐みがき装置の残骸で、砂漠の廃墟の跡から見つかる。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "粉砕機を製造可能、処理速度+18%、重さ+0.6kg、耐久+30%",
    "enables": "粉砕機",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "ancient_coin",
    "name": "砂に洗われた古金貨",
    "origName": "Sand-Beaten Coin",
    "description": "古代の貨幣で、砂漠の砂に埋まっていた。",
    "rarity": "uncommon",
    "materialRank": 4,
    "upgrade_effect": "壷を製造可能、装飾効果+5%、重さ-0.1kg、耐久+10%",
    "enables": "壷",
    "stats": {
      "atkBonus": 1,
      "defBonus": 1,
      "dmgBonus": 0.1,
      "weightMod": -0.2,
      "rankBonus": 0
    },
    "value": 140,
    "weight": 0.8,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "desert_bone_fragment",
    "name": "砂漠骨格の硬化化石",
    "origName": "Ancient Bone",
    "description": "砂漠の荒地に埋もれた古代の生物の骨で、鋭い形をしている。",
    "rarity": "rare",
    "materialRank": 7,
    "upgrade_effect": "槍を製造可能、貫通+18%、重さ-0.5kg、耐久+25%",
    "enables": "槍",
    "stats": {
      "atkBonus": 2,
      "defBonus": 1,
      "dmgBonus": 0.2,
      "weightMod": -0.5,
      "rankBonus": 1
    },
    "value": 350,
    "weight": 1.5,
    "stackable": true,
    "slot": "mat"
  },
  {
    "id": "ancient_forge_anvil",
    "name": "古代の鉄金床片",
    "origName": "Broken Anvil",
    "description": "古代の鍛冶場の鉄の金床で、壊れた状態だが貴重。",
    "rarity": "legendary",
    "materialRank": 10,
    "upgrade_effect": "鍛冶場を製造可能、鍛造効率+30%、重さ+2.0kg、耐久+45%",
    "enables": "鍛冶場",
    "stats": {
      "atkBonus": 4,
      "defBonus": 2,
      "dmgBonus": 0.35,
      "weightMod": -1,
      "rankBonus": 2
    },
    "value": 1000,
    "weight": 2.5,
    "stackable": true,
    "slot": "mat"
  }
].map((m) => [m.id, m])
));

export const SMITH_MATERIAL_LIST = Object.freeze(Object.values(SMITH_MATERIALS));

export const RESEARCH_ARTIFACTS = Object.freeze(Object.fromEntries(
  [
  {
    "id": "old_welding_manual",
    "name": "古い溶接機の取扱説明書",
    "description": "錆びた溶接機を動かすための手順書。電極の種類と電圧設定が書いてある。",
    "unlocks_research": "鍛冶",
    "rarity": "common",
    "value": 90,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "steel_plate_composition_table",
    "name": "腐食した鋼板の組成分析表",
    "description": "廃墟の鉄骨から採った鋼板の成分割合。どの鉄が使えるかの目安になる。",
    "unlocks_research": "鍛冶",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "handgun_design_sketch",
    "name": "手作り拳銃の設計図",
    "description": "廃鉄で作れる単発拳銃の図面。寸法と組み立て順序が粗く書かれている。",
    "unlocks_research": "射撃",
    "rarity": "common",
    "value": 90,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "gunpowder_mixing_notes",
    "name": "火薬の配合メモ",
    "description": "硝石と木炭の混ぜ比を記したメモ。湿気対策も雑に記されている。",
    "unlocks_research": "射撃",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "scope_lens_grinding",
    "name": "光学スコープのレンズ研磨法",
    "description": "廃レンズを研いで照準器にする手順。倍率を出すための研ぎ方が書いてある。",
    "unlocks_research": "射撃",
    "rarity": "rare",
    "value": 550,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "welding_robot_control_chip",
    "name": "自動溶接ロボの制御チップ",
    "description": "廃工場から持ち出したチップ。正しい配線を知れば精密溶接が可能になる。",
    "unlocks_research": "機械",
    "rarity": "rare",
    "value": 550,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "battery_restoration_method",
    "name": "古いバッテリーの復活法",
    "description": "枯れた蓄電池を蘇らせる手順書。電解液の補充タイミングが記されている。",
    "unlocks_research": "電力",
    "rarity": "common",
    "value": 90,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "solar_panel_wiring",
    "name": "ソーラーパネルの接続図",
    "description": "廃屋根に並んだパネルの配線図。蓄電池への繋ぎ方と逆流防止の仕組みが書いてある。",
    "unlocks_research": "電力",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "generator_maintenance_manual",
    "name": "発電機の整備マニュアル",
    "description": "ガソリン発電機の点検手順。プラグ交換と燃料フィルターの掃除方法が載っている。",
    "unlocks_research": "電力",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "concrete_mix_records",
    "name": "コンクリート配合の古資料",
    "description": "セメントと砂利の配合率を記した表。壁の強度を出すための水の量も書いてある。",
    "unlocks_research": "建築",
    "rarity": "common",
    "value": 90,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "rebar_placement_diagram",
    "name": "補強鉄筋の配置図",
    "description": "コンクリート壁に入れる鉄筋の間隔と太さの図。崩れにくい建物を作るための指針。",
    "unlocks_research": "建築",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "heat_resistant_lining_materials",
    "name": "耐熱ライニングの材料表",
    "description": "高熱に耐える内張りの素材と厚さの一覧。炉や暖炉の建設に必要。",
    "unlocks_research": "建築",
    "rarity": "rare",
    "value": 550,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "bulletproof_glass_fragments",
    "name": "防弾ガラスの製法断片",
    "description": "複数枚のガラスを重ねて貼り合わせる製法のメモ。砂漠の陽射しを遮る壁にも使える。",
    "unlocks_research": "防具",
    "rarity": "rare",
    "value": 550,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "bulletproof_vest_breakdown",
    "name": "古い防弾チョッキの分解図",
    "description": "チョッキの中身の繊維とプレートの配置を示す図。自分で防具を作る際の参考になる。",
    "unlocks_research": "防具",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "kevlar_spinning_notes",
    "name": "ケブラー繊維の紡ぎ方",
    "description": "強靭な糸を紡ぐための繊維処理手順。廃衣服から繊維を取り出すコツも書いてある。",
    "unlocks_research": "防具",
    "rarity": "rare",
    "value": 550,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "sterilization_procedure",
    "name": "古医療器具の滅菌手順",
    "description": "診療所の廃棄品に混ざっていた手順書。煮沸と乾燥の時間が書いてある。",
    "unlocks_research": "医療",
    "rarity": "common",
    "value": 90,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "antibiotic_culture_memo",
    "name": "抗生物質の培養メモ",
    "description": "カビから薬を作るための培養手順。温度と湿度の管理が雑に記されている。",
    "unlocks_research": "医療",
    "rarity": "rare",
    "value": 550,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "surgery_atlas",
    "name": "外科手術の古図鑑",
    "description": "切開と縫合の手順を図解した本。ページの半分は水に濡れて読めない。",
    "unlocks_research": "医療",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "prosthetic_adjustment_chart",
    "name": "義肢の調整チャート",
    "description": "義手・義足を体に合わせるための測定表。骨の太さと固定方法が書いてある。",
    "unlocks_research": "医療",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "dried_food_preservation",
    "name": "乾燥食品の保存技術",
    "description": "食品を長く持たせる乾燥方法のメモ。塩の量と日陰保存のコツが書いてある。",
    "unlocks_research": "農業",
    "rarity": "common",
    "value": 90,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "seed_storage_design",
    "name": "種子保存庫の設計図",
    "description": "種子を乾燥させて保管する小屋の図。温度変化を抑える壁の構造が書いてある。",
    "unlocks_research": "農業",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "hydroponic_nutrient_recipe",
    "name": "水耕栽培の栽培液レシピ",
    "description": "土を使わずに作物を育てる液肥の配合。廃ビニールハウスに転がっていた。",
    "unlocks_research": "農業",
    "rarity": "rare",
    "value": 550,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "irrigation_pump_repair",
    "name": "灌漑ポンプの修理書",
    "description": "井戸水を汲み上げるポンプの分解図。パッキンの交換時期も記されている。",
    "unlocks_research": "農業",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "tractor_maintenance_notebook",
    "name": "古いトラクターの整備手帳",
    "description": "農機具のエンジンを動かすための点検リスト。オイル交換の目安が書いてある。",
    "unlocks_research": "機械",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "internal_combustion_engine_diagram",
    "name": "内燃エンジンの分解図",
    "description": "エンジンの中身の配置を示す詳細な図。ピストンとクランクシャフトの関係がわかる。",
    "unlocks_research": "機械",
    "rarity": "rare",
    "value": 550,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "gear_ratio_chart",
    "name": "ギア比の計算表",
    "description": "歯車の組み合わせと回転速度の表。古い装置を動かす際の参考になる。",
    "unlocks_research": "機械",
    "rarity": "common",
    "value": 90,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "hydraulic_seal_materials",
    "name": "油圧シールの材質リスト",
    "description": "油漏れを防ぐパッキンの材質と耐圧の一覧。廃車両から取った部品の修理に使える。",
    "unlocks_research": "機械",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "old_radar_circuit",
    "name": "古いレーダーの回路図",
    "description": "電波を飛ばして物体を探す装置の回路。アンテナの向きと出力設定が書いてある。",
    "unlocks_research": "電力",
    "rarity": "rare",
    "value": 550,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "night_vision_tube_specs",
    "name": "夜視装置の増倍管仕様",
    "description": "暗闇を映す装置の中心部品の仕様書。電圧をかけすぎると壊れる警告がついている。",
    "unlocks_research": "射撃",
    "rarity": "rare",
    "value": 550,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "gas_mask_filter_composition",
    "name": "防毒マスクのフィルター構成",
    "description": "有害ガスを吸い込まないフィルターの素材構成。砂嵐の多い地域での使用に適している。",
    "unlocks_research": "防具",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "old_map_survey_records",
    "name": "古い地図の測量記録",
    "description": "廃墟地帯の標高と建物位置を記した記録。拠点を選ぶ際の参考になる。",
    "unlocks_research": "建築",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "steel_welding_temp_table",
    "name": "鉄骨溶接の温度表",
    "description": "鉄の種類ごとに適切な溶接温度を記した表。焼きすぎると脆くなる注意書きがある。",
    "unlocks_research": "鍛冶",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "alloy_steel_quenching",
    "name": "合金鋼の焼入れ手順",
    "description": "鋼を加熱して急冷し硬度を上げる手順。刃物や打撃用道具を作る際に必要。",
    "unlocks_research": "鍛冶",
    "rarity": "rare",
    "value": 550,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "barrel_rifling_measurement",
    "name": "古い銃身のリフリング測定法",
    "description": "銃身の内部に刻まれた溝の深さを測る方法。弾の回転を安定させるための手順。",
    "unlocks_research": "射撃",
    "rarity": "uncommon",
    "value": 220,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "xray_shielding_design",
    "name": "医療用X線の遮蔽設計",
    "description": "診察室の壁に必要な鉛板の厚さを記した設計図。放射線を外に漏らさないための仕様。",
    "unlocks_research": "建築",
    "rarity": "rare",
    "value": 550,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "shelter_vent_duct_diagram",
    "name": "避難所の換気ダクト図",
    "description": "地下施設の空気循環を作るダクトの配置図。排気口の位置と径が書いてある。",
    "unlocks_research": "建築",
    "rarity": "common",
    "value": 90,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "record_player_repair",
    "name": "古いレコード再生機の修理書",
    "description": "針と回転盤の調整手順。廃墟にある音楽装置を動かすための記録。",
    "unlocks_research": "機械",
    "rarity": "common",
    "value": 90,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "data_storage_recovery",
    "name": "データストレージの復旧法",
    "description": "壊れた記録装置から情報を取り出す手順。端子の接続順序を間違えると消える。",
    "unlocks_research": "電力",
    "rarity": "rare",
    "value": 550,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "sentry_turret_aim_base",
    "name": "古い自動銃塔の照準基盤",
    "description": "標的を自動で狙う装置の土台部分。残っていれば遠距離からの防衛が格段に楽になる。",
    "unlocks_research": "機械",
    "rarity": "legendary",
    "value": 1350,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  },
  {
    "id": "nuclear_power_cell_manual",
    "name": "核動力セルの取扱説明書",
    "description": "長期間電力を供給するセルの扱い方。取り扱いを誤れば周囲が使い物にならなくなる。",
    "unlocks_research": "電力",
    "rarity": "legendary",
    "value": 1350,
    "weight": 1,
    "stackable": false,
    "slot": "artifact"
  }
].map((a) => [a.id, a])
));

export const RESEARCH_ARTIFACT_LIST = Object.freeze(Object.values(RESEARCH_ARTIFACTS));
