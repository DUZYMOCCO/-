import { displayKana } from '../../kana-mode.js?v=171';
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
    '俺が正面を引きつける！横から突け！',
    '威圧感に呑まれるな！足を止めなければ勝てる！',
    '攻撃の隙を見逃すな！集中しろ！',
    'これだけの巨体だ、どこに当てても効くはずだ！',
    '背後に回り込め！死角があるぞ！',
    '全員で一斉に畳み掛けるぞ！合図を待て！',
    '弱点は頭部か胸元だ！狙いを定めろ！',
    '恐れるな！俺たちの連携なら倒せる！',
    '巨躯を崩せ！体勢を崩せば勝機はある！',
    '隊長が道を切り拓いてくれた、続け！',
    'ここで討ち取って、凱旋するぞ！'
  ],

  DEBT_REPAID: [
    'あの時の借りを今返すぜ！',
    '隊長、あの時の恩はここで返します！',
    '助けてもらった命だ、今度は俺の番だ！',
    '借りは必ず返すさ、隊長！',
    '待たせたな、あの時の礼をさせてくれ！',
    'あんたに助けられた命だ、無駄にはしねえ！',
    '約束どおり来たぜ、隊長！',
    '今度は俺が運ぶ番だ、しっかりしてくれ！',
    'あの時の礼だ、必ず本陣まで連れて行く！',
    '恩人を見捨てるわけにはいかねえ！'
  ],
  DEBT_SETTLED: [
    'これで貸し借りなしだ',
    '借りは返したぜ、隊長',
    'さあ、これでおあいこだな',
    'これで胸のつかえが取れたよ',
    '恩は返した、あとは自分の足で立ちな',
    '貸しも借りもなし、それでいい',
    'じゃあな、無理はするなよ',
    'これでようやく肩の荷が下りた',
    '礼は済んだ、達者でな',
    'これで気が楽になった'
  ],
  FRIEND_FAREWELL: [
    '友よ、またな',
    'まずい時はまた呼んでくれ、友よ',
    '俺たちはもう友だ、いつでも駆けつける',
    '友の危機なら何度でも飛んでくるぜ',
    'また会おう、友よ',
    'あんたとは長い付き合いになりそうだ',
    '友よ、次も頼ってくれ',
    '背中は任せな、友よ',
    '生きてまた会おうぜ、友よ',
    '今日の借りはいつか俺が頼む、友よ'
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
    '俺が守る！運んでくれ！',
    '倒れた奴を踏ませるな！守りを固めろ！',
    '血を止めろ！傷口を強く押さえろ！',
    '今助けるからな！意識を保て！',
    'あいつを連れて下がれ！ここは食い止める！',
    '絶対に死なせるな！息をつなげ！',
    '声を出し続けろ！眠るんじゃない！',
    '背負い縄を用意しろ！運搬を急げ！',
    'まだ終わってない！生き延びろ！',
    '仲間を置いていくわけにはいかない！',
    'すぐに安全な場所へ運ぶぞ！'
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
    '死なせません、絶対に！',
    '傷口を洗浄します、少し沁みますよ！',
    '軟膏を塗ります、じっとしていて！',
    '命を繋ぎ止めます…持ちこたえて！',
    '呼吸が戻ってきた…よかった…！',
    '安静にしてください、無理は禁物です！',
    'すぐに本陣か救護所へ搬送しましょう！',
    '脈拍が安定してきました、安心してください！',
    '痛みを抑える霊薬を投与します！',
    'もう大丈夫、私がついていますからね！',
    '命の灯火、決して消させません！'
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
    '二度と倒れはしない…行くぞ！',
    '地獄の底から這い上がってきたぜ！',
    '生かされた命だ、無駄にはせん！',
    '衛生兵の腕に救われたな…恩に着る！',
    '傷口は塞がった、隊列に戻るぞ！',
    '立ち上がれる…まだ戦いは終わってない！',
    '温かい手当てだった…力が湧いてきた！',
    '今度は俺が仲間を守る盾になる！',
    '倒れた分、取り返してみせる！',
    'まだ死神に連れていかれるわけにはいかん！',
    '隊長、戦線復帰の許可を！'
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
    '隊長、一匹仕留めました！',
    '呼吸を乱さず、一閃！',
    '袈裟斬り、決まった！',
    '敵陣の一角を突き崩したぞ！',
    '鍛錬の成果が出たな！',
    'この武器の切れ味、最高だ！',
    '次の一撃も外さない！',
    '敵の重心を見切った！',
    '手応え十分、次へ回れ！',
    '真っ二つだ！勢いに乗るぞ！',
    '武勲をまた一つ刻んだぜ！'
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
    '隊長、すまねぇ…きつい…！',
    '傷口が疼くが…膝は折らん！',
    '息を整えろ…一撃だけなら耐えられる！',
    '背中を預けるぞ…頼む！',
    '回復薬が欲しいところだ…！',
    '死線を超えてみせる…！',
    '呼吸が乱れてる…落ち着け、俺！',
    'まだだ、ここで終わってたまるか！'
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
    '隊長、次の作戦指示をお願いします',
    '焚き火の火が落ち着くぜ…',
    '干し肉をかじって精をつけるか',
    '弓の弦を張り替えておこう',
    '鎧の留め具を締め直さなきゃな',
    '仲間と飲む酒は格別だろうな',
    '肩の凝りをほぐしておくか',
    'このひとときが一番ありがたい',
    '次の戦いに向けて英気を養おう',
    '深呼吸して、気を引き締め直そう',
    'みんな、よく持ちこたえたな'
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
    '戦利品の確認をしなくちゃな',
    '本陣の篝火が見えたときは泣きそうだったぜ',
    '砦の門をくぐると緊張が解けるな',
    '鍛冶屋で武器の打ち直しを頼もう',
    '倉庫に物資を搬入しておこう',
    '予備兵のみんな、留守を守ってくれて感謝だ',
    '温かい飯を腹いっぱい食いたいぜ',
    '次の遠征の準備を怠るなよ',
    '本陣の防壁、実に頼もしい造りだ',
    '仲間と無事を祝い合おう',
    '隊長、お疲れさまでした！'
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
    '大切に手入れして使わせてもらいます',
    'バランスが絶妙だ、振り抜きやすい！',
    '魔力が宿っているのか…温かいぞ',
    'この盾なら敵の強打も防ぎきれる！',
    '身につけると背筋が伸びる思いだ',
    '期待に応えてみせます、この装備で！',
    '工匠の魂が込められた逸品だな',
    '装甲の隙間がしっかり補強されてる！',
    'この輝き、戦場でも誇らしいぜ',
    '次の戦いでこの装備の真価を見せてやる！',
    '隊長の配慮に感謝します！'
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
    '一歩ずつ進もう、焦りは禁物だ',
    '物陰の警戒を怠るなよ',
    '斥候の合図を見逃すな',
    '足音を潜めて進むぞ',
    '周囲の地形を把握しておけ',
    'いつでも迎撃できる隊列を保て',
    '風下からの接近に注意しろ',
    '道標が見えてきたな',
    'この先は見通しが悪い、慎重に行こう',
    '周囲の鳥が飛び立った…何かいるぞ',
    '油断大敵、気を抜くなよ'
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
    '雑兵の盾とて、国を支える壁だ！',
    '防陣完成！衝撃に備えろ！',
    '敵の突撃、正面から受け止める！',
    'この盾を破れるものなら破ってみろ！',
    '仲間には指一本触れさせん！',
    'どっしり構えろ、狼狽えるな！',
    '重歩兵の誇りを胸に耐え抜く！',
    '盾の重みは仲間の命の重みだ！',
    '前線を一歩も譲る気はないぞ！'
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
    '素早さで勝負だ！',
    '連撃叩き込むぜ！',
    '敵の側面ががら空きだ！',
    '翻弄して隙を引きずり出す！',
    '刃の切れ味、試させてもらうぜ！',
    '身軽さが俺の最大の武器だ！',
    '影のように忍び寄り、一閃！',
    '捉えられるものなら捉えてみろ！',
    '足捌きなら誰にも負けねぇ！'
  ],

  CLASS_ARCHER: [
    '射線確保！狙い撃つ！',
    '風を読め…放て！',
    '遠距離から削る！近寄らせるな！',
    '眉間を射抜く！',
    '矢の残り、まだ十分だ！',
    '射程圏内に入ったぞ！',
    '逃がしはしない！一矢必中！',
    '前衛の頭上を越えて届かせる！',
    '雨のように降らせてやる！',
    '敵の指揮官に狙いを絞る！',
    '足止め用の矢を放つぞ！',
    '曲射で障害物の向こうを突く！',
    '弦の張りは上々だ！',
    '間合いを保ちながら射ち続ける！',
    '後方援護は任せておけ！',
    '敵の急所、はっきり見えている！',
    '矢筒が空になるまで撃ち尽くす！',
    '狙撃完了、次を装填！'
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
    '魔導の力、甘く見ないで！',
    '元素の理を紡ぎ、敵を討つ！',
    'マナの流れを収束させる…！',
    '焦土と化せ、紅蓮の劫火！',
    '凍てつく風よ、敵の足を止めよ！',
    '神秘のヴェールよ、我らを守護せよ！',
    '術者の間合いに入ったことを後悔しなさい！',
    '魔法の輝きは戦場の道標です！',
    '詠唱完了、全力展開！'
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
    '生きて帰りましょう、全員で！',
    '薬草の調合、間に合いました！',
    '担架を準備してあります！',
    '無理な前進は控えてくださいね！',
    '祈りと共に、傷を癒します！',
    '一人も欠けさせはしません！',
    '命の温もりを保ち続けて…！',
    '救命の手当て、迅速に行います！',
    'あなたが無事でよかった…！'
  ],

  CLASS_NINJA: [
    '御意…影より討つ。',
    '気配を断て…見敵必殺。',
    '忍法・変わり身の術！',
    '手裏剣一閃！',
    '死角からの刃、受けよ。',
    '闇に消える…探しても無駄だ。',
    '風の如く現れ、露の如く消える。',
    '任務了解…速やかに仕留める。',
    '足音一つ立てずに背後を取った。',
    '急所は既に見切った。',
    '煙幕展開…視界を奪う！',
    '影に潜み、好機を待つ。',
    '音もなく忍び寄るのが我らの流儀。',
    '敵の油断、突かせてもらう。',
    '抜刀一閃、露払いを果たす。',
    '忍びの技、侮るなかれ。',
    '主の命とあれば、修羅にもなろう。',
    '任務完了…次なる命を。'
  ],

  CLASS_BEAST: [
    'ガルル…血の匂いが騒ぐぜ！',
    '野性の勘が告げている、ここだ！',
    '爪を研いでおいた甲斐があったな！',
    '唸れ、我が牙！獲物は逃さん！',
    '風下の匂いで敵の数がわかるぞ！',
    '咆哮を轟かせろ！怯むのは敵だ！',
    '大地を蹴る足腰、鈍っちゃいねぇ！',
    '獣の直感を甘く見るなよ！',
    '獲物の急所、匂いで丸わかりだ！',
    '毛並みが逆立つ…強敵のお出ましだな！',
    '一撃で仕留めてやる、覚悟しな！',
    '群れの仲間は俺が守る！',
    '牙を剥いて立ち向かうのみ！',
    '肉を裂き、骨を砕く力を見せてやる！',
    '鼻が利くんでな、不意打ちは通じねぇよ！',
    '野性の血が沸き立つぜ！',
    '仲間を傷つける奴は許さねぇ！',
    'ワオーン！勝利の遠吠えを上げてやる！'
  ],

  // シチュエーション固有
  NIGHT_COMBAT: [
    '暗がりから来るぞ！目を凝らせ！',
    '松明の灯りを頼りにしろ！',
    '夜の闇に紛れている…気をつけろ！',
    '暗視を利かせろ、影の動きを追え！',
    '背後を取られるな！互いに背中を合わせろ！',
    '月明かりの下、敵の輪郭を捉えた！',
    '夜間の戦闘だ、奇襲を警戒しろ！',
    '暗闇を恐れるな、音に耳を澄ませろ！',
    '篝火の周囲から離れすぎるなよ！',
    '夜の帳が下りても、我らの刃は鈍らん！',
    '暗がりでの足元、転倒に注意だ！',
    '闇夜を切り裂いて進むぞ！',
    '星明かりが照らしてくれている、行ける！',
    '夜の静寂を破る敵…迎え撃て！',
    '暗がりでの同士討ちに注意しろ！',
    '朝が来るまで持ちこたえようぜ！',
    '夜目が利く奴、先導を頼む！',
    '夜襲を跳ね返せばこちらの勝ちだ！'
  ],

  DUNGEON_EXPLORE: [
    '空気が淀んでいる…罠に気をつけろ。',
    '壁の向こうから物音が聞こえるぞ…',
    '足元注意だ、崩落の危険がある！',
    '宝箱を見つけたら声をかけてくれ！',
    '魔窟の気配だ…気を引き締めろ。',
    '天井の鍾乳石や仕掛けに注意しろよ！',
    '狭い通路だ、隊列を一列に保て！',
    '壁のたいまつに火を灯しながら進もう。',
    '冷たい風が吹き込んでくる…出口が近いか？',
    '石造りの迷宮、迷わないよう印をつけろ。',
    '奥に何か巨大な魔物が潜んでいそうだ…',
    '足音が反響する、慎重に進め。',
    '遺跡の遺産、無事に持ち帰ろうぜ！',
    '湿り気がある…毒沼に足を取られるなよ！',
    '古代の仕掛け扉か…用心して開けよう。',
    '壁の亀裂から敵が湧き出るかもしれん！',
    '暗がりで視界が悪い、灯りを絶やすな！',
    'ダンジョンの最深部まで、隊長についていくぞ！'
  ],

  INVASION_DEFENSE: [
    '本陣に一歩も通すな！死守せよ！',
    '総力戦だ！全員、持てる力を出し切れ！',
    '退くな！後ろには守るべき仲間がいる！',
    '砦の防衛線を絶対に破らせるな！',
    '魔王軍め…ここで全滅させてやる！',
    '陣形を崩すな！波状攻撃を耐え凌げ！',
    '本陣の篝火を消させるわけにはいかん！',
    'ここが天下分け目の正念場だ！',
    '門番と連携しろ！左右から挟撃だ！',
    '防壁を盾にしろ！頭上からの矢を凌げ！',
    '数で勝っていても油断するな、押し返せ！',
    '俺たちの城を土足で踏み躙らせてたまるか！',
    '援軍が来るまで耐え抜け！',
    '隊長の下、鉄の結束を見せつけるぞ！',
    '一人も敵を陣内に入れるな！',
    '迎撃態勢、完了！迎え撃て！',
    '国の命運がかかっている、負けられん！',
    '鉄の分隊の底力、思い知らせてやろう！'
  ],

  LEVEL_UP_REACTION: [
    '力のみなぎりを感じる…！',
    '技が研ぎ澄まされたようだ！',
    '一皮剥けたぜ！体が軽い！',
    'これならもっと戦えるぞ！',
    '日々の鍛錬が実を結んだな！',
    '武勲を重ねて、さらに上を目指す！',
    '武器の扱いが一段と手に馴染んできた！',
    '視野が広がった気がするぜ！',
    '新たな境地に達した…感謝します、隊長！',
    'これなら強敵相手でも渡り合える！',
    '仲間の支えがあってこその成長だ！',
    'まだまだ強くなれる、限界なんてない！',
    '身のこなしが鋭くなったのを感じる！',
    'この力を部隊のために役立ててみせる！',
    '強くなった実感がある、腕が鳴るぜ！',
    '隊長の背中を追って、ここまで来られた！',
    '次の戦い、俺の成長を見ていてくれ！',
    '雑兵から一人前の戦士へ…感慨深いな！'
  ],

  FARM_LEISURE: [
    '土の匂いはやっぱり落ち着くなぁ。',
    'いい汗かいたぜ、農作業も悪くない！',
    '次の収穫が楽しみだな、豊作だといいが。',
    '鍬の扱いも、槍と同じで腰が大事だな！',
    '冷たい麦茶が喉に沁み渡るぜ…',
    'たまには武器を置いて土をいじるのもいい。',
    '川のせせらぎを聞きながら一服するか。',
    '畑を耕してると、平和の尊さを実感するよ。',
    '兵糧がしっかり実れば、前線も安心だ！',
    '草むしりも手際が肝心だな。',
    '農村の風はどこか懐かしい匂いがする。',
    '腰を伸ばして…あぁ、気持ちいい！',
    '仲間と食べる握り飯は格別の味だな。',
    'みんなで作った野菜、本陣の鍋に入れようぜ！',
    '土を耕す力も、剣を振る力に繋がってるさ。',
    '青空の下で一息つくのが一番の贅沢だな。',
    '予備兵の仕事も、国を支える大事な務めだ。',
    '次の出撃要請まで、しっかり精を出そう！'
  ]
};

// 兵種・種族に応じた追加固有カテゴリの取得
function getClassCategory(soldier) {
  if (!soldier) return null;
  const role = soldier.doctrine || soldier.jobRole || soldier.role || soldier.soldierClass || '';
  const cls = soldier.classId || soldier.type || soldier.combatClass || '';
  const species = soldier.species || '';

  if (soldier.soldierClass === 'NINJA' || /ninja|忍者/i.test(role) || /ninja|忍者/i.test(cls)) return 'CLASS_NINJA';
  if (species || /beast|獣人/i.test(role) || /beast|獣人/i.test(cls)) return 'CLASS_BEAST';
  if (/heavy|knight|paladin|guardian|iron/i.test(role) || /重装|騎士|盾/i.test(cls) || role === 'HEAVY') return 'CLASS_HEAVY';
  if (/light|scout|rogue|assassin|blade/i.test(role) || /軽装|遊撃|剣士/i.test(cls) || role === 'LIGHT') return 'CLASS_LIGHT';
  if (/archer|sniper|ranger|bow/i.test(role) || /弓|狙撃|射手/i.test(cls) || role === 'ARCHER' || role === 'SNIPER') return 'CLASS_ARCHER';
  if (/mage|wizard|sorcerer|elemental/i.test(role) || /魔導|魔法|術士/i.test(cls) || role === 'MAGE') return 'CLASS_MAGE';
  if (/medic|priest|cleric|bishop/i.test(role) || /衛生|回復|僧侶|司祭/i.test(cls) || role === 'MEDIC') return 'CLASS_MEDIC';
  return null;
}

// テキストの自動折り返し処理（画面幅・高倍率対応）
/**
 * 門番が隊長を拾うときの台詞候補。
 * repeat: 過去に隊長を救助済み / family: 隊長の姓（不明なら空）/ gender: 'male'|'female'|その他（不明なら家名の行は出さない）。
 */
export function guardRescueLines({repeat=false,family='',gender=''}={}) {
  const lines=['大丈夫か？','めんどくせぇなぁ'];
  if(repeat)lines.push('また転がってるのか');
  const child=gender==='male'?'息子':gender==='female'?'娘':'';
  if(family&&child)lines.push(`お前、${family}家の${child}か？`);
  return lines;
}
export function wrapDialogueText(ctx, text, maxW) {
  if (!text) return [''];
  text = displayKana(text); // 変換後の文字列で幅を測り、語の途中で折り返さない
  if (!ctx || typeof ctx.measureText !== 'function') return [text];
  const totalW = ctx.measureText(text).width;
  if (totalW <= maxW) return [text];

  // 区切り文字（！、？、…、！、？、など）による分割を優先探索
  const splitDelims = ['！', '!', '？', '?', '…', '、', '。', ' '];
  let bestSplit = -1;
  let bestScore = Infinity;

  for (let i = 1; i < text.length; i++) {
    const ch = text[i - 1];
    if (splitDelims.includes(ch)) {
      const part1 = text.slice(0, i);
      const part2 = text.slice(i);
      const w1 = ctx.measureText(part1).width;
      const w2 = ctx.measureText(part2).width;
      const overflow = Math.max(0, w1 - maxW) + Math.max(0, w2 - maxW);
      const balance = Math.abs(w1 - w2);
      const score = overflow * 1000 + balance;
      if (score < bestScore) {
        bestScore = score;
        bestSplit = i;
      }
    }
  }

  // 適切な区切り文字がないか、区切り文字でも overflow する場合、文字幅基準で中央付近を探す
  if (bestSplit === -1 || bestScore >= 1000) {
    let minDiff = Infinity;
    for (let i = 1; i < text.length; i++) {
      const part1 = text.slice(0, i);
      const part2 = text.slice(i);
      const w1 = ctx.measureText(part1).width;
      const w2 = ctx.measureText(part2).width;
      const overflow = Math.max(0, w1 - maxW) + Math.max(0, w2 - maxW);
      const balance = Math.abs(w1 - w2);
      const score = overflow * 1000 + balance;
      if (score < minDiff) {
        minDiff = score;
        bestSplit = i;
      }
    }
  }

  if (bestSplit > 0 && bestSplit < text.length) {
    const p1 = text.slice(0, bestSplit).trimEnd(); // 分かち書きのスペースは行末・行頭に残さない
    const p2 = text.slice(bestSplit).trimStart();
    const lines = [p1];
    if (ctx.measureText(p2).width > maxW && p2.length > 4) {
      lines.push(...wrapDialogueText(ctx, p2, maxW));
    } else {
      lines.push(p2);
    }
    return lines;
  }

  return [text];
}

export class SoldierDialogueManager {
  constructor() {
    this.resultNotice = null;
    this.activeBubbles = []; // [{ id, soldierId, text, x, y, life, maxLife, opacity, scale }]
    this.recentHistory = []; // 直近30件のテキスト（重複排除用）
    this.maxHistory = 30;
    this.soldierCooldowns = new Map(); // soldierId -> timestamp
    this.globalCooldownUntil = 0; // 全体レートリミット（3.5秒）
    this.individualCooldownMs = 15000; // 同一兵士は15秒間発言不可
    this.globalCooldownMs = 3500; // 全体で3.5秒は空ける
    this.maxActiveBubbles = 2; // 同時に画面内に出るのは最大2個まで
    this.bubbleLifetime = 1.8; // フキダシ表示時間（1.8秒）
    this._lastLevelUpTime = 0; // 同時レベルアップ発言抑制用
  }

  // リセット
  reset() {
    this.resultNotice = null;
    this.activeBubbles = [];
    this.recentHistory = [];
    this.soldierCooldowns.clear();
    this.globalCooldownUntil = 0;
    this._lastLevelUpTime = 0;
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
    if (!soldier || soldier.dead || soldier.isDown) return false;

    if (forced) {
      // 複数人同時レベルアップ時は代表1人のみ発言（重なり防止）
      if (category === 'LEVEL_UP_REACTION') {
        if (this._lastLevelUpTime && now - this._lastLevelUpTime < 1200) return false;
        this._lastLevelUpTime = now;
      }
      // 強制発言時でも画面上の最大同時表示数 (maxActiveBubbles=2) を厳守
      while (this.activeBubbles.length >= this.maxActiveBubbles) {
        this.activeBubbles.shift();
      }
    } else {
      if (!this.canTrigger(soldier, now)) return false;
    }

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

  // 固定の台詞をそのまま吹き出しにする（門番の救助台詞など）
  say(unit, text, now = Date.now()) {
    if (!unit || !text) return false;
    while (this.activeBubbles.length >= this.maxActiveBubbles) this.activeBubbles.shift();
    this.soldierCooldowns.set(unit.id, now);
    this.activeBubbles.push({id:Math.random().toString(36).slice(2,9),soldierId:unit.id,soldierRef:unit,text,x:unit.x,y:unit.y-24,life:this.bubbleLifetime,maxLife:this.bubbleLifetime,opacity:0,scale:0.8});
    return true;
  }

  // 時間更新
  update(dt) {
    if(this.resultNotice){
      this.resultNotice.life-=dt;
      if(this.resultNotice.life<=0)this.resultNotice=null;
    }
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
  draw(ctx, camera = null, zoom = 1.0, logicalWidth = null) {
    if (this.activeBubbles.length === 0) return;

    ctx.save();
    ctx.font = 'bold 9px "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 画面の論理幅（DPRに依存しないUI基準幅、例: 320）
    let screenWidth = 320;
    if (Number.isFinite(logicalWidth) && logicalWidth > 0) {
      screenWidth = logicalWidth;
    } else if (typeof window !== 'undefined' && window.devicePixelRatio > 1 && ctx.canvas?.width > 0) {
      screenWidth = ctx.canvas.width / window.devicePixelRatio;
    } else if (ctx.canvas?.width > 0) {
      screenWidth = ctx.canvas.width;
    }

    const currentZoom = Math.max(0.1, Number(zoom) || 1.0);
    // 画面幅に対して、両端に余白を残したワールド空間での最大テキスト幅（最小80、最大175）
    const maxTextW = Math.max(80, Math.min(175, (screenWidth - 28) / currentZoom - 14));

    for (const b of this.activeBubbles) {
      if (b.opacity <= 0) continue;

      // 描画座標（ctxはすでにワールド座標空間にあるためb.x, b.yをそのまま使用）
      const sx = b.x;
      const sy = b.y;

      // テキスト自動折り返し
      const lines = wrapDialogueText(ctx, b.text, maxTextW);
      let textW = 0;
      for (const line of lines) {
        const w = Math.ceil(ctx.measureText(line).width);
        if (w > textW) textW = w;
      }

      const padX = 7;
      const padY = 4;
      const bw = textW + padX * 2;
      const lineHeight = 11;
      const bh = lines.length === 1 ? (14 + padY * 2) : (lines.length * lineHeight + padY * 2 + 2);
      const radius = 5;

      // 画面内への水平位置クランプ（画面の論理幅基準）
      let offsetBoxX = 0;
      if (camera && Number.isFinite(camera.x)) {
        const halfVisW = (screenWidth / 2) / currentZoom;
        const minX = camera.x - halfVisW + bw / 2 + 8;
        const maxX = camera.x + halfVisW - bw / 2 - 8;
        if (minX <= maxX) {
          const clampedX = Math.max(minX, Math.min(maxX, sx));
          offsetBoxX = clampedX - sx;
        }
      }

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

      const bx = -bw / 2 + offsetBoxX;
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

      // 下部の小さな三角ポインタ（しっぽは兵士頭上 x=0 を指す）
      const tailX = Math.max(bx + 6, Math.min(bx + bw - 6, 0));
      ctx.beginPath();
      ctx.moveTo(tailX - 3, by + bh);
      ctx.lineTo(tailX + (0 - tailX) * 0.4, by + bh + 3);
      ctx.lineTo(tailX + 3, by + bh);
      if (typeof ctx.closePath === 'function') ctx.closePath();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fill();

      // テキスト描画（白文字＋わずかなドロップシャドウ）
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 2;
      ctx.fillStyle = '#f8fafc';
      const textCenterX = bx + bw / 2;
      if (lines.length === 1) {
        ctx.fillText(lines[0], textCenterX, by + bh / 2 + 0.5);
      } else {
        const startY = by + padY + 6;
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], textCenterX, startY + i * lineHeight);
        }
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // A fixed result is independent of random chatter and its cooldown/slots.
  notifyResult(anchor,lines) {
    if(!anchor||!Array.isArray(lines)||!lines.length)return false;
    this.resultNotice={anchor,lines:lines.map(String),life:3,maxLife:3};
    return true;
  }

  // Screen-space text stays legible at every field zoom, after fog/atmosphere.
  drawResult(ctx,camera,zoom,width,height) {
    const notice=this.resultNotice;
    if(!notice||!camera||!(width>0&&height>0)||!(zoom>0))return;
    const ax=width/2+(notice.anchor.x-camera.x)*zoom;
    const ay=height/2+(notice.anchor.y-camera.y)*zoom;
    if(ax< -16||ax>width+16||ay< -16||ay>height+16)return;
    ctx.save();ctx.font='bold 13px sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
    const lines=notice.lines.map(displayKana);
    const bw=Math.min(width-24,Math.max(...lines.map(line=>ctx.measureText(line).width))+28);
    const bh=lines.length*17+16;
    const x=Math.max(12,Math.min(width-bw-12,ax-bw/2));
    const above=ay>(notice.anchor.radius||24)*zoom+bh+44;
    const wanted=above?ay-(notice.anchor.radius||24)*zoom-16-bh:ay+20;
    const y=Math.max(36,Math.min(Math.max(36,height-160-bh),wanted));
    ctx.globalAlpha=Math.min(1,notice.life/.35);
    ctx.fillStyle='rgba(20,29,25,.94)';ctx.strokeStyle='#9b9674';ctx.lineWidth=1;ctx.shadowBlur=0;
    ctx.beginPath();if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,bw,bh,7);else ctx.rect(x,y,bw,bh);ctx.fill();ctx.stroke();
    const tail=Math.max(x+12,Math.min(x+bw-12,ax)),baseY=above?y+bh:y;
    ctx.beginPath();ctx.moveTo(tail-5,baseY);ctx.lineTo(tail+(ax-tail)*.3,baseY+(above?8:-8));ctx.lineTo(tail+5,baseY);ctx.closePath();ctx.fill();
    for(let i=0;i<lines.length;i++){
      ctx.fillStyle=i===0?'#e4d09b':'#f0eee1';
      ctx.fillText(lines[i],x+14,y+16+i*17,bw-28);
    }
    ctx.restore();
    return {x,y,width:bw,height:bh};
  }
}

export const soldierDialogue = new SoldierDialogueManager();
