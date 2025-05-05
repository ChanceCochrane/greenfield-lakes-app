export interface User {
  name: string;
  handicap: number;
  currentRound: number[];
  rounds?: Round[];
}

export interface Round {
  date: string;
  roundScores: number[];
  handicap: number;
}
