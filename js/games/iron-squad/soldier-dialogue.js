// 兵士の一言フキダシ（感情・戦況リアクション）システム
// 操作を邪魔しない控えめなCanvas描画 ＆ 直近重複排除エンジン（Anti-Repetition）

export const DIALOGUE_CATEGORIES = {
  BOSS_ENCOUNTER: [
    'デカい…だが足元は隙だらけだ',
    '隊長、下がっててください！',
    'うわっ、あれとやり合うのか…',
    '怯むな！囲んで叩け！',
    '仕留めたら大武勲だぞ！',
    '気圧されるな、ただの的だ！',
    '呼吸を合わせろ、一撃を狙う！',
    '震えるな…俺たちがやるんだ！',
    '奴の攻撃、大振りだぞ！避けろ！',
    '前衛、持ちこたえろ！',
    '後衛は距離を取れ！巻き込まれるな！',
    '怪物が…！だが肉なら斬れる！',
    '隊列を崩すな！耐え凌げ！',
    'ここが正念場だ、気合入れろ！',
    '俺が正面を引きつける！横から突け！'
  ],

  ALLY_DOWN: [
    'おい！目を開けろ！',
    'くそっ、やられた！',
    '衛生兵！こっちだ、早く！',
    'まだ息はある！持ちこたえろ！',
    '仇は討つ…待ってろ！',
    '誰か手を貸せ、後方へ運ぶ！',
    '諦めるな！死ぬには早すぎる！',
    '踏みとどまれ！援護する！',
    'ちくしょう…油断した！',
    '担げ！救護所まで走れ！',
    'まだ心臓が動いてるぞ！',
    'ここで死なせはしない！',
    '衛生兵ーっ！急いでくれ！',
    'しっかりしろ、故郷へ帰るんだろ！',
    '俺が守る！運んでくれ！'
  ],

  MEDIC_APPROACH: [
    '今行きます！持ちこたえて！',
    '傷を見せて！すぐ手当てします！',
    '諦めないで！息を吸って！',
    '急所は外れてます、助かります！',
    '薬が効くまで耐えてください！',
    'すぐに楽になりますからね！',
    '止血します！動かないで！',
    'まだ光は消えてない…間に合え！',
    '痛みますが我慢してください！',
    '生きてる…よかった、間に合った！',
    '脈があります！手当てを急ぎます！',
    '神よ、この者に力を…！',
    '深呼吸してください、大丈夫です！',
    'あとは任せて…休んでいて！',
    '死なせません、絶対に！'
  ],

  REVIVED: [
    '…助かったのか、恩に着る',
    'まだ息があるな…感謝する！',
    '借りができたな…ありがとよ',
    '情けないとこ見せた…次はやらん！',
    '痛み止めが効いてきた、行くぞ！',
    '生きてる…ありがてぇ、衛生兵！',
    '一瞬、三途の川が見えたぜ…',
    '死ぬかと思った…恩人だな',
    '体が動く！まだ戦えるぞ！',
    'すまねぇ、迷惑をかけた！',
    '次は俺がお前を守る番だ',
    '生き返った…！隊長、復帰します！',
    'あいつめ、やり返しに行ってやる！',
    '手当て感謝する！武器をくれ！',
    '二度と倒れはしない…行くぞ！'
  ],

  CRITICAL_KILL: [
    '手応えあり！',
    '芯を捉えたぞ！',
    'どうだ、思い知ったか！',
    '次！かかってこい！',
    '一丁上がり！',
    '急所一閃！',
    '盾ごと叩き割ったぞ！',
    '隙だらけだ！',
    '狙い通りだ！',
    'いい当たりだ！',
    '足元を刈り取った！',
    '雑兵の太刀筋、侮るなよ！',
    'よし、崩れたぞ！畳み掛けろ！',
    '見たか！俺の一撃！',
    '隊長、一匹仕留めました！'
  ],

  LOW_HP: [
    'くそっ、盾がもたん…！',
    'かすり傷だ…まだ動ける！',
    '足に力が入らねぇ…耐えろ！',
    'ここで退けるかよ…！',
    '息が…上がってきた…！',
    '守りを固める！耐え忍べ！',
    '血が止まらねぇが…まだ立つ！',
    'やばいな、間合いを取らねば…',
    'まだだ…まだ倒れるわけには…！',
    '歯を食いしばれ…死線だぞ！',
    '誰か…援護を…！',
    '意地でも立ってやる…！',
    '目が霞むが…敵は見えている！',
    '骨までは達してねぇ…！',
    '隊長、すまねぇ…きつい…！'
  ],

  REST_START: [
    'ふぅ…一息つけるか',
    '武器の刃こぼれを直さねば',
    '靴の中に小石が入ってた…',
    '腹減ったな…今夜は何だ？',
    '生きて次の期を迎えられたな',
    '汗で革鎧が重いぜ…',
    'みんな、無事か？怪我はないか？',
    '喉がカラカラだ…水筒くれ',
    '砥石で槍先を研いでおくか',
    'ちょっと腰を下ろさせてくれ…',
    '次の波までに呼吸を整えよう',
    '怪我人は手当てを受けておけよ',
    '生き残るたび、強くなってる気がする',
    '風が気持ちいいな…少しの間だが',
    '隊長、次の作戦指示をお願いします'
  ],

  CAMP_RETURN: [
    '生きて戻れたな…',
    'やっぱり本陣は落ち着くぜ',
    '熱いスープが飲みたい',
    '装備の手入れをしておくか',
    'ひとまず安心だな',
    '次の出撃まで体を休めよう',
    '城壁の内側はホッとするな',
    '行商人は何か新しい品あるかな',
    '怪我人を救護所へ頼む！',
    '補給を済ませておこうぜ',
    '隊長、今回の遠征も見事でした',
    '戻ってこられた…ありがてぇ',
    '仲間が全員揃ってるといいが…',
    '風呂に入りたい気分だぜ',
    '戦利品の確認をしなくちゃな'
  ],

  GEAR_ACQUIRED: [
    '新品同様じゃないか！',
    'これ、俺が使っていいのか？',
    '手に馴染むな…いい武器だ！',
    '隊長、大切に使います！',
    '前のより断然軽いぞ！',
    '守りが固くなった気がする！',
    '前の持ち主の武勲を受け継ぐぞ',
    '刃の輝きが違うな…すげぇ！',
    'これで次も生き残れる！',
    'いい業物だ…腕が鳴るぜ！',
    '仕立てがいい防具だな、感謝します！',
    '俺なんかにこんな良い装備を…！',
    '鍛冶屋のいい仕事だな',
    '重厚な装甲だ、安心感が違う！',
    '大切に手入れして使わせてもらいます'
  ],

  PATROL: [
    '風が冷たいな…',
    '足元に気をつけろよ',
    '街道の先、何か動いたか？',
    '油断するなよ、見張りを怠るな',
    '隊長の後ろについていこう',
    '陣形を崩すなよ',
    '霧が深くなってきたな…',
    '草むらに何か潜んでないか？',
    '武器の握りを確かめておけよ',
    '遠くに物音がしたような…',
    '焦るな、歩調を合わせろ',
    '怪我してる奴はいないか？',
    '矢の残りを点検しておこう',
    '夜になる前に片付けたいな',
    '道端の花…こんな戦場でも咲くんだな',
    'いつでも抜刀できるようにしとけ',
    '空の雲行きが怪しいな',
    '静かすぎる…何か来るぞ',
    '背後は俺が見ている、前を頼む',
    '一歩ずつ進もう、焦りは禁物だ'
  ],

  // 兵種固有の掛け声
  CLASS_HEAVY: [
    'ここは俺が食い止める！',
    '頑丈さだけが取り柄だからな！',
    '大盾の後ろに隠れてろ！',
    '俺を倒してから行け！',
    '重装甲の意地、見せてやる！',
    'びくともせんぞ！叩いてみろ！',
    '壁となって仲間を守る！',
    '踏ん張れ！一歩も引くな！',
    '鋼の守りは伊達じゃない！',
    '雑兵の盾とて、国を支える壁だ！'
  ],

  CLASS_LIGHT: [
    '回り込むぞ！足元を狙え！',
    '遅ぇよ！ついてこれるか？',
    '死角からの一撃だ！',
    '撹乱する！隙を作れ！',
    '当たらなければどうということはない！',
    '風のように駆け抜けるぜ！',
    '急所は貰った！',
    '影を追う暇があるなら武器を構えな！',
    'ヒット＆アウェイだ、深追いするな！',
    '素早さで勝負だ！'
  ],

  CLASS_MAGE: [
    '魔力充填…吹き飛べ！',
    '近づかないで…詠唱中です！',
    '炎よ、敵を焼き尽くせ！',
    '氷結の檻に閉じ込めろ！',
    '魔力の波動を感知…撃ちます！',
    '後方支援は任せてください！',
    '範囲魔法を展開します、下がって！',
    '雷撃よ、大地を穿て！',
    '術式完了…一掃する！',
    '魔導の力、甘く見ないで！'
  ],

  CLASS_MEDIC: [
    '怪我はないですか？無理しないで！',
    '無事でいて…すぐに治します！',
    '救護班、配置についています！',
    '癒しの光よ、傷を塞いで…！',
    '命を繋ぐのが私の役目です！',
    '痛みを和らげます、深呼吸して！',
    '前線の皆さん、背中は見守っています！',
    '誰も死なせません、信じてください！',
    '解毒と止血の準備、完了しています！',
    '生きて帰りましょう、全員で！'
  ]
};

// 兵種に応じた追加固有カテゴリの取得
function getClassCategory(soldier) {
  const role = soldier?.doctrine || soldier?.jobRole || soldier?.role || '';
  const cls = soldier?.classId || soldier?.type || '';
  if (/heavy|knight|paladin|guardian|iron/i.test(role) || /重装|騎士|盾/i.test(cls)) return 'CLASS_HEAVY';
  if (/light|scout|rogue|assassin|blade/i.test(role) || /軽装|遊撃|剣士/i.test(cls)) return 'CLASS_LIGHT';
  if (/mage|wizard|sorcerer|elemental/i.test(role) || /魔導|魔法|術士/i.test(cls)) return 'CLASS_MAGE';
  if (/medic|priest|cleric|bishop/i.test(role) || /衛生|回復|僧侶|司祭/i.test(cls)) return 'CLASS_MEDIC';
  return null;
}

export class SoldierDialogueManager {
  constructor() {
    this.activeBubbles = []; // [{ id, soldierId, text, x, y, life, maxLife, opacity, scale }]
    this.recentHistory = []; // 直近30件のテキスト（重複排除用）
    this.maxHistory = 30;
    this.soldierCooldowns = new Map(); // soldierId -> timestamp
    this.globalCooldownUntil = 0; // 全体レートリミット（3.5秒）
    this.individualCooldownMs = 15000; // 同一兵士は15秒間発言不可
    this.globalCooldownMs = 3500; // 全体で3.5秒は空ける
    this.maxActiveBubbles = 2; // 同時に画面内に出るのは最大2個まで
    this.bubbleLifetime = 1.8; // フキダシ表示時間（1.8秒）
  }

  // リセット
  reset() {
    this.activeBubbles = [];
    this.recentHistory = [];
    this.soldierCooldowns.clear();
    this.globalCooldownUntil = 0;
  }

  // 発言可能かチェック
  canTrigger(soldier, now) {
    if (!soldier || soldier.dead || soldier.isDown) return false;
    if (now < this.globalCooldownUntil) return false;
    if (this.activeBubbles.length >= this.maxActiveBubbles) return false;
    
    const soldierLast = this.soldierCooldowns.get(soldier.id);
    if (soldierLast !== undefined && now - soldierLast < this.individualCooldownMs) return false;

    return true;
  }

  // セリフの候補プールを作成（シチュエーション＋兵種＋重複排除）
  getCandidates(category, soldier) {
    let list = [...(DIALOGUE_CATEGORIES[category] || [])];
    
    // 兵種固有セリフも30%の確率でプールに混ぜる
    const classCat = getClassCategory(soldier);
    if (classCat && DIALOGUE_CATEGORIES[classCat] && Math.random() < 0.35) {
      list = [...list, ...DIALOGUE_CATEGORIES[classCat]];
    }

    if (list.length === 0) return [];

    // 直近30件で使われたセリフを除外（Anti-Repetition）
    const recentSet = new Set(this.recentHistory);
    let freshList = list.filter(text => !recentSet.has(text));

    // もし除外した結果空になった場合は、元のリストから選ぶ（安全策）
    return freshList.length > 0 ? freshList : list;
  }

  // フキダシをトリガー
  trigger(soldier, category, now = Date.now(), forced = false) {
    if (!forced && !this.canTrigger(soldier, now)) return false;

    const candidates = this.getCandidates(category, soldier);
    if (candidates.length === 0) return false;

    // ランダム抽選
    const text = candidates[Math.floor(Math.random() * candidates.length)];

    // 重複防止履歴にプッシュ
    this.recentHistory.push(text);
    if (this.recentHistory.length > this.maxHistory) {
      this.recentHistory.shift();
    }

    // クールダウン更新
    this.soldierCooldowns.set(soldier.id, now);
    this.globalCooldownUntil = now + this.globalCooldownMs;

    // フキダシオブジェクト生成
    const bubble = {
      id: Math.random().toString(36).slice(2, 9),
      soldierId: soldier.id,
      soldierRef: soldier,
      text,
      x: soldier.x,
      y: soldier.y - 24, // 兵士の頭上・HPバーの上
      life: this.bubbleLifetime,
      maxLife: this.bubbleLifetime,
      opacity: 0,
      scale: 0.8
    };

    this.activeBubbles.push(bubble);
    return true;
  }

  // 時間更新
  update(dt) {
    for (let i = this.activeBubbles.length - 1; i >= 0; i--) {
      const b = this.activeBubbles[i];
      b.life -= dt;

      if (b.life <= 0) {
        this.activeBubbles.splice(i, 1);
        continue;
      }

      // 兵士が生きていれば位置を追従（少し上にふわっと浮く）
      if (b.soldierRef && !b.soldierRef.dead) {
        b.x = b.soldierRef.x;
        const floatProgress = 1 - (b.life / b.maxLife);
        b.y = b.soldierRef.y - 24 - (floatProgress * 6); // 上に最大6pxスライド
      }

      // 出現フェードイン（最初の0.2秒）＆ 退場フェードアウト（最後の0.35秒）
      const age = b.maxLife - b.life;
      if (age < 0.2) {
        b.opacity = age / 0.2;
        b.scale = 0.8 + 0.2 * (age / 0.2);
      } else if (b.life < 0.35) {
        b.opacity = b.life / 0.35;
        b.scale = 1.0;
      } else {
        b.opacity = 1.0;
        b.scale = 1.0;
      }
    }
  }

  // Canvas描画（カメラ座標系）
  draw(ctx, camera = null, zoom = 1.0) {
    if (this.activeBubbles.length === 0) return;

    ctx.save();
    ctx.font = 'bold 9px "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const b of this.activeBubbles) {
      if (b.opacity <= 0) continue;

      // 描画座標（ctxはすでにワールド座標空間にあるためb.x, b.yをそのまま使用）
      const sx = b.x;
      const sy = b.y;

      // テキスト幅計測
      const metrics = ctx.measureText(b.text);
      const textW = Math.ceil(metrics.width);
      const padX = 7;
      const padY = 4;
      const bw = textW + padX * 2;
      const bh = 14 + padY * 2;
      const radius = 5;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, b.opacity * 0.92));
      ctx.translate(sx, sy);
      if (b.scale !== 1.0) {
        ctx.scale(b.scale, b.scale);
      }

      // フキダシ背景（上品なダーク半透明）
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 1;

      const bx = -bw / 2;
      const by = -bh;

      // 角丸四角形（roundRectフォールバック対応）
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bx, by, bw, bh, radius);
      } else {
        ctx.rect(bx, by, bw, bh);
      }
      ctx.fill();
      ctx.stroke();

      // 下部の小さな三角ポインタ
      ctx.beginPath();
      ctx.moveTo(-3, by + bh);
      ctx.lineTo(0, by + bh + 3);
      ctx.lineTo(3, by + bh);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fill();

      // テキスト描画（白文字＋わずかなドロップシャドウ）
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 2;
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(b.text, 0, by + bh / 2 + 0.5);

      ctx.restore();
    }

    ctx.restore();
  }
}

export const soldierDialogue = new SoldierDialogueManager();
