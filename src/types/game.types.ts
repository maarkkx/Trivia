import type { WebSocket } from "ws";

export interface Player {
  id: string;
  socket: WebSocket;
  roomCode: string | null;
  name?: string;
  score: number;
  answered?: boolean;
}

export type RoomStatus = "waiting" | "playing" | "finished";

export interface Room {
  code: string;
  host: Player; //Jugador que crea la sala
  guest: Player | null; //Jugador que se une
  status: RoomStatus;
  currentQuestionIndex: number;
  hostCorrectAnswer?: string;
  guestCorrectAnswer?: string;
  questionsAsked: number;
  host_answered?: boolean;
  guest_answered?: boolean;
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
    }
  | {
      type: "join_room";
      code: string;
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
    }
  | {
      type: "room_joined";
      code: string;
    }
  | {
      type: "player_joined";
      playerId: string;
    }
  | {
      type: "game_start";
      question: string;
      answers: string[];
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
