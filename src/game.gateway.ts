import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private waitingPlayer: string | null = null;
  private rooms: {
    [key: string]: {
      player1: string;
      player2: string;
      choices: { [key: string]: string };
      scores: { player1: number; player2: number }; // เพิ่มการเก็บคะแนน
    };
  } = {};

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    if (this.waitingPlayer === client.id) {
      this.waitingPlayer = null;
    }

    for (const room in this.rooms) {
      if (
        this.rooms[room].player1 === client.id ||
        this.rooms[room].player2 === client.id
      ) {
        delete this.rooms[room];
        this.server.to(room).emit('opponentLeft');
        break;
      }
    }
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(client: Socket) {
    if (this.waitingPlayer === null) {
      this.waitingPlayer = client.id;
      client.emit('waitingForOpponent');
    } else {
      const room = `room-${client.id}-${this.waitingPlayer}`;
      this.rooms[room] = {
        player1: this.waitingPlayer,
        player2: client.id,
        choices: {},
        scores: { player1: 0, player2: 0 }, // เริ่มต้นคะแนนเป็น 0
      };
      client.join(room);
      this.server
        .to(this.waitingPlayer)
        .emit('joinedGame', { room, player: 'Player 1', opponent: 'Player 2' });
      client.emit('joinedGame', {
        room,
        player: 'Player 2',
        opponent: 'Player 1',
      });
      this.waitingPlayer = null;
    }
  }

  @SubscribeMessage('makeMove')
  handleMakeMove(client: Socket, payload: { room: string; choice: string }) {
    const { room, choice } = payload;
    if (!this.rooms[room]) return;

    const playerKey =
      this.rooms[room].player1 === client.id ? 'player1' : 'player2';
    this.rooms[room].choices[playerKey] = choice;

    if (Object.keys(this.rooms[room].choices).length === 2) {
      const result = this.determineWinner(this.rooms[room].choices);

      if (result.player1 === 'Draw!') {
        // ส่งให้ทั้งสองฝั่งรู้ว่าเกมเสมอ
        this.server.to(this.rooms[room].player1).emit('draw', {
          yourChoice: this.rooms[room].choices['player1'],
          opponentChoice: this.rooms[room].choices['player2'],
          score: this.rooms[room].scores,
        });

        this.server.to(this.rooms[room].player2).emit('draw', {
          yourChoice: this.rooms[room].choices['player2'],
          opponentChoice: this.rooms[room].choices['player1'],
          score: this.rooms[room].scores,
        });

        // รีเซ็ตการเลือกเมื่อเสมอ
        this.rooms[room].choices = {};
      } else {
        // อัปเดตคะแนน
        if (result.player1 === 'You win!') {
          this.rooms[room].scores.player1++;
        } else {
          this.rooms[room].scores.player2++;
        }

        // ส่งผลลัพธ์ให้ผู้เล่นทั้งสองคน
        this.server.to(this.rooms[room].player1).emit('showChoices', {
          yourChoice: this.rooms[room].choices['player1'],
          opponentChoice: this.rooms[room].choices['player2'],
          result: result.player1,
          score: this.rooms[room].scores, // ส่งคะแนนไปที่ไคลเอนต์
        });

        this.server.to(this.rooms[room].player2).emit('showChoices', {
          yourChoice: this.rooms[room].choices['player2'],
          opponentChoice: this.rooms[room].choices['player1'],
          result: result.player2,
          score: this.rooms[room].scores, // ส่งคะแนนไปที่ไคลเอนต์
        });

        // ตรวจสอบว่าผู้เล่นใดชนะครบ 2 รอบหรือยัง
        if (this.rooms[room].scores.player1 === 2) {
          this.server
            .to(this.rooms[room].player1)
            .emit('gameOver', 'You win the game!');
          this.server
            .to(this.rooms[room].player2)
            .emit('gameOver', 'You lose the game!');
          delete this.rooms[room]; // ลบห้องเมื่อเกมจบ
        } else if (this.rooms[room].scores.player2 === 2) {
          this.server
            .to(this.rooms[room].player1)
            .emit('gameOver', 'You lose the game!');
          this.server
            .to(this.rooms[room].player2)
            .emit('gameOver', 'You win the game!');
          delete this.rooms[room];
        } else {
          // เริ่มรอบใหม่
          this.rooms[room].choices = {};
        }
      }
    }
  }
  private determineWinner(choices: { [key: string]: string }): {
    player1: string;
    player2: string;
  } {
    const [choice1, choice2] = Object.values(choices);

    if (choice1 === choice2) {
      return { player1: 'Draw!', player2: 'Draw!' };
    }

    if (
      (choice1 === 'rock' && choice2 === 'scissors') ||
      (choice1 === 'scissors' && choice2 === 'paper') ||
      (choice1 === 'paper' && choice2 === 'rock')
    ) {
      return { player1: 'You win!', player2: 'You lose!' };
    }

    return { player1: 'You lose!', player2: 'You win!' };
  }
}
