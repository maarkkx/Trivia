import type { WebSocket } from "ws";

export interface Player {
  id: string;
  socket: WebSocket;
  roomCode: string | null;
  name?: string;
  score: number;
}

export type RoomStatus = "waiting" | "playing" | "finished";

export interface Room {
  code: string;
  host: Player;
  guest: Player | null;
  status: RoomStatus;
  questionsAsked: number;
  hostAnswered: boolean;
  guestAnswered: boolean;
  hostCorrectIndex?: number;
  guestCorrectIndex?: number;
}

export interface TriviaQuestion {
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  allAnswers: string[];
}

export type ClientMessage =
  | {
      type: "create_room";
      name: string;
    }
  | {
      type: "join_room";
      code: string;
      name: string;
    }
  | {
      type: "answer";
      answerIndex: number;
    }
  | {
      type: "leave_room";
    };

export type ServerMessage =
  | {
      type: "connected";
      playerId: string;
    }
  | {
      type: "room_created";
      code: string;
      playerName: string;
    }
  | {
      type: "room_joined";
      code: string;
      playerName: string;
    }
  | {
      type: "player_joined";
      playerId: string;
      playerName: string;
    }
  | {
      type: "game_start";
      question: string;
      answers: string[];
      playerName: string;
      opponentName: string;
    }
  | {
      type: "new_question";
      question: string;
      answers: string[];
    }
  | {
      type: "answer_result";
      correct: boolean;
      playerScore: number;
      opponentScore: number;
      cooldown?: number;
    }
  | {
      type: "score_update";
      playerScore: number;
      opponentScore: number;
    }
  | {
      type: "game_over";
      winner: "you" | "opponent";
      message: string;
    }
  | {
      type: "opponent_left";
    }
  | {
      type: "error";
      message: string;
    };
