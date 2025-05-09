export interface User {
  name: string;
  handicap: number;
  currentRound: number[];
  rounds?: Round[];
  paidSkins: boolean;
}

export interface Round {
  date: string;
  roundScores: number[];
  handicap: number;
}
