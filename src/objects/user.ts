export interface Round {
  date: string;
  roundScores: number[];
}

export interface User {
  name: string;
  handicap: number;
  currentRound: number[];
  rounds?: Round[]; // optional to support users that don’t have any yet
}
