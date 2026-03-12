import type { WebSocket } from "ws";

// Estructura de un jugador
export interface Player {
  id: string;
  socket: WebSocket;
  roomCode: string | null;
  name: string;
  score: number;
  answered: boolean;
}

// Una sala de joc que inclou el host, el guest i l'estat del joc
export interface Room {
  code: string;
  host: Player;
  guest: Player | null;
  status: string;
  questionsAsked: number;
  hostCorrectIndex: number;
  guestCorrectIndex: number;
}

//Estructura de una pregunta de trivia, que es retorna des de l'API i es processa per enviar al client
export interface Question {
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  allAnswers: string[];
}

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
