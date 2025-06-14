// =============================
// インベーダーゲーム メインロジック
// =============================

// --- ゲーム状態定義 ---
const GAME_STATE = {
    READY: 'ready',
    PLAYING: 'playing',
    WIN: 'win',
    GAMEOVER: 'gameover'
};

// --- プレイヤークラス ---
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 20;
        this.speed = 6;
        this.color = '#fff';
        this.isShooting = false;
    }
    move(dir) {
        this.x += dir * this.speed;
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > 800) this.x = 800 - this.width;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// --- 弾クラス ---
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 6;
        this.height = 16;
        this.speed = 10;
        this.active = true;
        this.color = '#fff';
    }
    update() {
        this.y -= this.speed;
        if (this.y + this.height < 0) this.active = false;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// --- 敵弾クラス ---
class EnemyBullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 6;
        this.height = 16;
        this.speed = 7;
        this.active = true;
        this.color = '#f33'; // 赤色
    }
    update() {
        this.y += this.speed;
        if (this.y > 600) this.active = false;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}


// --- 敵クラス ---
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 28;
        this.color = '#0f0';
        this.active = true;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// --- 敵編隊クラス ---
class EnemyGroup {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.enemies = [];
        this.dir = 1; // 1:右, -1:左
        this.speed = 2;
        this.stepDown = 18;
        this.frameCount = 0;
        this.init();
    }
    // 敵を初期配置
    init() {
        this.enemies = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.enemies.push(new Enemy(80 + c * 60, 50 + r * 50));
            }
        }
    }
    // 敵の移動処理
    update() {
        let edge = false;
        for (const e of this.enemies) {
            if (!e.active) continue;
            e.x += this.speed * this.dir;
            if (e.x < 0 || e.x + e.width > 800) edge = true;
        }
        // 端に到達したら全体で下に移動し、方向転換
        if (edge) {
            this.dir *= -1;
            for (const e of this.enemies) {
                if (e.active) e.y += this.stepDown;
            }
        }
    }
    // 敵の描画
    draw(ctx) {
        for (const e of this.enemies) {
            if (e.active) e.draw(ctx);
        }
    }
    // 1体でも下端に到達したか判定
    reachedBottom() {
        for (const e of this.enemies) {
            if (e.active && e.y + e.height >= 580) return true;
        }
        return false;
    }
    // 全滅判定
    isAllDefeated() {
        return this.enemies.every(e => !e.active);
    }
}

// --- ゲーム管理クラス ---
class Game {
    constructor() {
        // --- Canvas/Context取得 ---
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        // --- UI要素 ---
        this.scoreElem = document.getElementById('score');
        this.messageElem = document.getElementById('message');
        this.startBtn = document.getElementById('startBtn');
        // --- レベル管理 ---
        this.level = 1;
        this.maxLevel = 5;
        // --- ゲーム状態 ---
        this.state = GAME_STATE.READY;
        this.score = 0;
        // --- オブジェクト ---
        this.player = new Player(370, 560);
        this.bullets = [];
        this.enemyBullets = [];
        this.enemyGroup = this.createEnemyGroup();
        // --- 敵弾発射管理 ---
        this.enemyShootInterval = 60 - this.level * 8; // レベルで短縮
        this.enemyShootTimer = 0;
        // --- 入力 ---
        this.keyLeft = false;
        this.keyRight = false;
        // --- イベント登録 ---
        this.initEvents();
        this.render();
    }
    // レベルに応じた敵編隊生成
    createEnemyGroup() {
        // レベルごとに敵の数や速度を変化
        let rows = 4 + Math.floor((this.level - 1) / 2); // 4,4,5,5,6
        let cols = 5 + ((this.level - 1) % 2);           // 5,6,5,6,5
        let group = new EnemyGroup(rows, cols);
        group.speed = 2 + this.level - 1; // レベルごとに速く
        return group;
    }
    // --- イベント登録 ---
    initEvents() {
        document.addEventListener('keydown', e => {
            if (this.state !== GAME_STATE.PLAYING) return;
            if (e.code === 'ArrowLeft') this.keyLeft = true;
            if (e.code === 'ArrowRight') this.keyRight = true;
            if (e.code === 'Space') {
                e.preventDefault(); // デフォルト動作抑止（再起動防止）
                this.shoot();
            }
        });
        document.addEventListener('keyup', e => {
            if (e.code === 'ArrowLeft') this.keyLeft = false;
            if (e.code === 'ArrowRight') this.keyRight = false;
        });
        this.startBtn.addEventListener('click', () => this.start());
    }
    // --- ゲーム開始 ---
    start() {
        this.level = 1;
        this.state = GAME_STATE.PLAYING;
        this.score = 0;
        this.player = new Player(370, 560);
        this.bullets = [];
        this.enemyBullets = [];
        this.enemyGroup = this.createEnemyGroup();
        this.enemyShootInterval = 60 - this.level * 8;
        this.enemyShootTimer = 0;
        this.messageElem.textContent = '';
        this.scoreElem.textContent = 'スコア: 0';
        requestAnimationFrame(() => this.update());
    }
    // レベル開始処理
    startLevel() {
        this.state = GAME_STATE.PLAYING;
        this.player = new Player(370, 560);
        this.bullets = [];
        this.enemyBullets = [];
        this.enemyGroup = this.createEnemyGroup();
        this.enemyShootInterval = 60 - this.level * 8;
        this.enemyShootTimer = 0;
        this.messageElem.textContent = '';
        requestAnimationFrame(() => this.update());
    }
    // --- 弾発射 ---
    shoot() {
        // 連射防止: 画面上に弾がない時のみ
        if (this.bullets.length === 0 || this.bullets.every(b => !b.active)) {
            const bx = this.player.x + this.player.width / 2 - 3;
            const by = this.player.y - 16;
            this.bullets.push(new Bullet(bx, by));
        }
    }
    // --- メインループ ---
    update() {
        if (this.state !== GAME_STATE.PLAYING) {
            this.render();
            return;
        }
        // --- 入力処理 ---
        if (this.keyLeft) this.player.move(-1);
        if (this.keyRight) this.player.move(1);
        // --- 弾更新 ---
        for (const b of this.bullets) b.update();
        // --- 敵弾更新 ---
        for (const eb of this.enemyBullets) eb.update();
        // --- 敵移動 ---
        this.enemyGroup.update();
        // --- 敵弾発射 ---
        this.enemyShootTimer++;
        if (this.enemyShootTimer >= this.enemyShootInterval) {
            this.enemyShoot();
            this.enemyShootTimer = 0;
        }
        // --- 当たり判定 ---
        for (const b of this.bullets) {
            if (!b.active) continue;
            for (const e of this.enemyGroup.enemies) {
                if (e.active && this.hitTest(b, e)) {
                    b.active = false;
                    e.active = false;
                    this.score++;
                    this.scoreElem.textContent = `スコア: ${this.score}`;
                    break;
                }
            }
        }
        // --- 敵弾→プレイヤー当たり判定 ---
        for (const eb of this.enemyBullets) {
            if (eb.active && this.hitTest(eb, this.player)) {
                eb.active = false;
                this.state = GAME_STATE.GAMEOVER;
                this.messageElem.textContent = 'ゲームオーバー';
            }
        }
        // --- 弾の消去 ---
        this.bullets = this.bullets.filter(b => b.active);
        this.enemyBullets = this.enemyBullets.filter(eb => eb.active);
        // --- 敵全滅判定 ---
        if (this.enemyGroup.isAllDefeated()) {
            if (this.level < this.maxLevel) {
                this.state = GAME_STATE.WIN;
                this.messageElem.textContent = `レベル${this.level}クリア！ 次のレベルへ...`;
                setTimeout(() => {
                    this.level++;
                    this.startLevel();
                }, 1800);
            } else {
                this.state = GAME_STATE.WIN;
                this.messageElem.textContent = 'レベル5クリア！完全クリア！おめでとう！';
            }
        }
        // --- 敵が下端到達 ---
        if (this.enemyGroup.reachedBottom()) {
            this.state = GAME_STATE.GAMEOVER;
            this.messageElem.textContent = 'ゲームオーバー';
        }
        this.render();
        if (this.state === GAME_STATE.PLAYING) {
            requestAnimationFrame(() => this.update());
        }
    }
    // --- 敵弾発射 ---
    enemyShoot() {
        // アクティブな敵からランダム1体を選び発射
        const shooters = this.enemyGroup.enemies.filter(e => e.active);
        if (shooters.length === 0) return;
        const idx = Math.floor(Math.random() * shooters.length);
        const e = shooters[idx];
        const bx = e.x + e.width / 2 - 3;
        const by = e.y + e.height;
        this.enemyBullets.push(new EnemyBullet(bx, by));
    }
    // --- 当たり判定 ---
    hitTest(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }
    // --- 描画 ---
    render() {
        // --- 画面クリア ---
        this.ctx.clearRect(0, 0, 800, 600);
        // --- プレイヤー ---
        if (this.state !== GAME_STATE.READY) this.player.draw(this.ctx);
        // --- 弾 ---
        for (const b of this.bullets) b.draw(this.ctx);
        // --- 敵弾 ---
        for (const eb of this.enemyBullets) eb.draw(this.ctx);
        // --- 敵 ---
        this.enemyGroup.draw(this.ctx);
    }
}

// --- ゲーム初期化 ---
window.onload = () => {
    new Game();
};
