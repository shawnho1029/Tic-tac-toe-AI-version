// 初始 DOM 元素抓取 (保留原本架構)
const cells = Array.from(document.querySelectorAll('.cell'));
const btnReset = document.getElementById('reset');
const btnResetAll = document.getElementById('reset-all');
const statusText = document.getElementById('status-text'); // 改名更直觀
const scoreXEl = document.getElementById('score-x');
const scoreOEl = document.getElementById('score-o');
const scoreDrawEl = document.getElementById('score-draw');

// 遊戲狀態變數
let board;
let active;      // 遊戲是否進行中
let isHumanTurn; // 控制是否輪到玩家，防止玩家在AI思考時亂點

// 計分變數
let scoreX = 0;
let scoreO = 0;
let scoreDraw = 0;

// 定義玩家與電腦
const HUMAN = 'X';
const AI = 'O';

// 勝利條件 (8種連線)
const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// 初始化函式
function init() {
    board = Array(9).fill('');
    active = true;
    isHumanTurn = true; // 玩家永遠先手
    
    // 重置畫面
    cells.forEach(c => {
        c.textContent = '';
        c.className = 'cell'; // 清除 .x .o .win
        c.disabled = false;
    });
    
    statusText.textContent = '輪到玩家 (X)';
}

// 玩家下棋動作 (綁定於 click)
function handleHumanMove(idx) {
    // 如果遊戲結束、格子已有字、或不是玩家回合，則無效
    if (!active || board[idx] !== '' || !isHumanTurn) return;

    // 1. 玩家下子
    executeMove(idx, HUMAN);

    // 2. 判斷玩家是否贏了 (雖然Minimax理論上不會輸，但要防守)
    const result = evaluate(board);
    if (result.finished) {
        endGame(result);
        return;
    }

    // 3. 換電腦下 (進入AI思考時間)
    isHumanTurn = false;
    statusText.textContent = '電腦 (O) 思考中...';

    // 使用 setTimeout 讓 UI 有一點延遲感，才不會瞬間下完很突兀
    setTimeout(() => {
        const bestIdx = getBestMove(board);
        executeMove(bestIdx, AI);

        // 判斷電腦是否贏了
        const aiResult = evaluate(board);
        if (aiResult.finished) {
            endGame(aiResult);
        } else {
            isHumanTurn = true;
            statusText.textContent = '輪到玩家 (X)';
        }
    }, 500);
}

// 通用的下子函式 (更新資料與畫面)
function executeMove(idx, player) {
    board[idx] = player;
    const cell = cells[idx];
    cell.textContent = player;
    cell.classList.add(player.toLowerCase()); // 加 .x 或 .o class
}

// ---------------------------------------------------------
// AI 核心: Minimax 演算法 (不敗邏輯)
// ---------------------------------------------------------
function getBestMove(currentBoard) {
    let bestScore = -Infinity;
    let move = -1;

    // 遍歷所有空位
    for (let i = 0; i < 9; i++) {
        if (currentBoard[i] === '') {
            currentBoard[i] = AI; // 試著下這裡
            let score = minimax(currentBoard, 0, false);
            currentBoard[i] = ''; // 復原 (Backtracking)

            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }
    return move;
}

function minimax(currentBoard, depth, isMaximizing) {
    // 檢查遞迴終止條件：是否有人贏或平手
    const result = checkWinForMinimax(currentBoard);
    if (result !== null) {
        return result; // 回傳分數
    }

    if (isMaximizing) { // AI 回合 (找最大分)
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (currentBoard[i] === '') {
                currentBoard[i] = AI;
                // depth + 1 代表越快贏分數越高 (例如 10 - depth)
                let score = minimax(currentBoard, depth + 1, false);
                currentBoard[i] = '';
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else { // 玩家回合 (假設玩家極其聰明，會讓 AI 得最低分)
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (currentBoard[i] === '') {
                currentBoard[i] = HUMAN;
                let score = minimax(currentBoard, depth + 1, true);
                currentBoard[i] = '';
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

// Minimax 專用的快速勝負檢查 (回傳分數)
function checkWinForMinimax(board) {
    for (const line of WIN_LINES) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            if (board[a] === AI) return 10;
            if (board[a] === HUMAN) return -10;
        }
    }
    if (board.every(v => v !== '')) return 0; // 平手
    return null; // 遊戲尚未結束
}

// ---------------------------------------------------------
// 一般遊戲邏輯
// ---------------------------------------------------------

// 判斷目前盤面狀態 (用於主要遊戲循環)
function evaluate(board) {
    for (const line of WIN_LINES) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { finished: true, winner: board[a], line };
        }
    }
    if (board.every(v => v !== '')) return { finished: true, winner: null };
    return { finished: false };
}

// 遊戲結束處理
function endGame({ winner, line }) {
    active = false;
    if (winner) {
        statusText.textContent = `${winner === 'X' ? '玩家' : '電腦'} 勝利!`;
        line.forEach(i => cells[i].classList.add('win')); // 顯示連線特效
        if (winner === 'X') scoreX++; else scoreO++;
    } else {
        statusText.textContent = '平手!';
        scoreDraw++;
    }
    updateScoreboard();
    cells.forEach(c => c.disabled = true);
}

// 更新計分板
function updateScoreboard() {
    scoreXEl.textContent = scoreX;
    scoreOEl.textContent = scoreO;
    scoreDrawEl.textContent = scoreDraw;
}

// 事件監聽
cells.forEach(cell => {
    cell.addEventListener('click', () => {
        const idx = +cell.getAttribute('data-idx');
        handleHumanMove(idx);
    });
});

btnReset.addEventListener('click', init);

btnResetAll.addEventListener('click', () => {
    scoreX = scoreO = scoreDraw = 0;
    updateScoreboard();
    init();
});

// 啟動遊戲
init();