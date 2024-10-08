const socket = io();

let room; // ตัวแปรเก็บข้อมูลห้อง
let player; // ตัวแปรเก็บข้อมูลว่าคุณคือผู้เล่นใด

socket.on('connect', () => {
  socket.emit('joinGame');
});

socket.on('waitingForOpponent', () => {
  document.getElementById('status').innerText = 'Waiting for another player to join...';
});

socket.on('joinedGame', (data) => {
  room = data.room; // เก็บค่าห้องเมื่อเข้าร่วมเกมสำเร็จ
  player = data.player; // เก็บข้อมูลว่าคุณคือผู้เล่นใด
  document.getElementById('status').innerText = `${data.player}. Opponent is ${data.opponent}. Make your move!`;
});

socket.on('showChoices', (data) => {
  document.getElementById('status').innerText = `
    Current Score - You: ${player === 'Player 1' ? data.score.player1 : data.score.player2},
    You chose: ${data.yourChoice}.
    Opponent chose: ${data.opponentChoice}.
    Result: ${data.result}.
    Opponent: ${player === 'Player 1' ? data.score.player2 : data.score.player1}`;
});

socket.on('draw', (data) => {
  document.getElementById('status').innerText = `
  Current Score - You: ${player === 'Player 1' ? data.score.player1 : data.score.player2}, 
  It's a draw! You chose: ${data.yourChoice}. 
  Opponent chose: ${data.opponentChoice}. 
  Choose again!`;
});



socket.on('gameOver', (message) => {
  document.getElementById('status').innerText = message;
});

socket.on('opponentLeft', () => {
  document.getElementById('status').innerText = 'Opponent left the game. Waiting for a new opponent...';
});

function makeMove(choice) {
  if (!room) {
    alert('Please wait for an opponent to join.');
    return;
  }
  socket.emit('makeMove', { room, choice });
}
