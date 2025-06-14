// ゲーム全体の設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const scoreElement = document.getElementById('score');
const messageElement = document.getElementById('message');

// Canvasサイズの設定
canvas.width = 800;
canvas.height = 600;

// ゲーム状態管理
class GameState {
    constructor() {
        this.isRunning = false;
        this.score = 0;
        this.player = new Player();
        this.enemies = [];
        this.bullets = [];
        this.gameOver = false;
        this.initializeEnemies();
    }

    initializeEnemies() {
        const rows = 5;
        const cols = 4;
        const enemyWidth = 50;
        const enemyHeight = 50;
        const spacing = 60;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                this.enemies.push(new Enemy(
                    100 + j * spacing,
                    50 + i * spacing,
                    enemyWidth,
                    enemyHeight
                ));
            }
        }
    }

    update() {
        if (!this.isRunning || this.gameOver) return;

        // プレイヤーの更新
        this.player.update();

        // 敵の更新
        this.enemies.forEach(enemy => enemy.update());

        // 弾の更新
        this.bullets.forEach((bullet, index) => {
            bullet.update();
            if (bullet.y < 0) {
                this.bullets.splice(index, 1);
            }
        });

        // 当たり判定
        this.checkCollisions();

        // 敵の移動判定
        this.checkEnemyMovement();

        // スコア更新
        scoreElement.textContent = `スコア: ${this.score}`;
    }

    checkCollisions() {
        this.bullets.forEach((bullet, bulletIndex) => {
            this.enemies.forEach((enemy, enemyIndex) => {
                if (this.isColliding(bullet, enemy)) {
                    this.bullets.splice(bulletIndex, 1);
                    this.enemies.splice(enemyIndex, 1);
                    this.score += 10;
                }
            });
        });
    }

    checkEnemyMovement() {
        const enemies = this.enemies;
        if (enemies.length === 0) {
            this.gameOver = true;
            messageElement.textContent = '勝利！';
            return;
        }

        const bottomEnemy = enemies.reduce((prev, curr) => prev.y > curr.y ? prev : curr);
        if (bottomEnemy.y > canvas.height - 50) {
            this.gameOver = true;
            messageElement.textContent = 'ゲームオーバー！';
        }
    }

    isColliding(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
}

// プレイヤークラス
class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 30;
        this.width = 50;
        this.height = 30;
        this.speed = 5;
    }

    update() {
        // キー入力による移動
        if (keys.left && this.x > 0) this.x -= this.speed;
        if (keys.right && this.x < canvas.width - this.width) this.x += this.speed;

        // スペースキーで弾を発射
        if (keys.space && !keys.spacePressed) {
            gameState.bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y));
            keys.spacePressed = true;
        }
        if (!keys.space) keys.spacePressed = false;
    }

    draw() {
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// 敵クラス
class Enemy {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.direction = 1;
        this.speed = 2;
    }

    update() {
        // 左右移動
        this.x += this.direction * this.speed;

        // 画面端に到達した場合
        if (this.x < 0 || this.x > canvas.width - this.width) {
            this.direction *= -1;
            this.y += 20;
        }
    }

    draw() {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// 弾クラス
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 10;
        this.speed = 5;
    }

    update() {
        this.y -= this.speed;
    }

    draw() {
        ctx.fillStyle = '#FFFF00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// キー入力管理
const keys = {
    left: false,
    right: false,
    space: false,
    spacePressed: false
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === ' ' && !gameState.gameOver) {
        keys.space = true;
        if (!keys.spacePressed) {
            gameState.bullets.push(new Bullet(gameState.player.x + gameState.player.width / 2 - 2, gameState.player.y));
            keys.spacePressed = true;
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === ' ') {
        keys.space = false;
        keys.spacePressed = false;
    }
});

// ゲーム状態の初期化
let gameState = new GameState();

// ゲームループ
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    gameState.update();

    // 描画
    gameState.player.draw();
    gameState.bullets.forEach(bullet => bullet.draw());
    gameState.enemies.forEach(enemy => enemy.draw());

    if (gameState.isRunning && !gameState.gameOver) {
        requestAnimationFrame(gameLoop);
    }
}

// スタートボタンのイベントリスナー
startButton.addEventListener('click', () => {
    gameState = new GameState();
    gameState.isRunning = true;
    gameState.gameOver = false;
    messageElement.textContent = '';
    gameLoop();
});
