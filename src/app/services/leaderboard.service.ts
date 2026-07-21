import { Injectable } from '@angular/core';
import { User } from '../../objects/user';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { TeeTimeService } from './tee-time.service';
import { environment } from '../../environments/environment';

export interface FlightWinner {
  place: number;
  placeLabel: string;
  name: string;
  score: number;
  payout: number;
}

export interface FlightWinners {
  gross: FlightWinner[];
  net: FlightWinner[];
}

@Injectable({
  providedIn: 'root',
})
export class LeaderboardService {
  // Hole indexes ordered from hardest (handicap 1) to easiest, used for scorecard playoffs
  private holesByDifficulty: number[] = environment.courseHandicapValues
    .map((hcp: number, idx: number) => ({ hcp, idx }))
    .sort((a: { hcp: number; idx: number }, b: { hcp: number; idx: number }) => a.hcp - b.hcp)
    .map((h: { hcp: number; idx: number }) => h.idx);

  constructor(private teeTimeService: TeeTimeService) {}

  getNetLeaderboardForDate(date: string): Observable<User[]> {
    const targetDate = new Date(date).toISOString().split('T')[0];

    return this.teeTimeService.getUsers().pipe(
      map((users: User[]) =>
        users
          .filter(user =>
            user.rounds?.some(round =>
              new Date(round.date).toISOString().split('T')[0] === targetDate
            )
          )
          .map(user => ({
            ...user,
            handicap: this.calculateHandicap(user, targetDate),
            currentRound: this.getRoundForDate(user, targetDate),
          }))
          .sort((a, b) => this.calculateNetTotal(a) - this.calculateNetTotal(b))
      )
    );
  }

  getGrossLeaderboardForDate(date: string): Observable<User[]> {
    const targetDate = new Date(date).toISOString().split('T')[0];

    return this.teeTimeService.getUsers().pipe(
      map((users: User[]) =>
        users
          .filter(user =>
            user.rounds?.some(round =>
              new Date(round.date).toISOString().split('T')[0] === targetDate
            )
          )
          .map(user => ({
            ...user,
            currentRound: this.getRoundForDate(user, targetDate),
          }))
          .sort((a, b) => this.calculateTotal(a) - this.calculateTotal(b))
      )
    );
  }

  private getRoundForDate(user: User, date: string): number[] {
    const round = user.rounds?.find(
      round =>
        new Date(round.date).toISOString().split('T')[0] === date
    );
    return round?.roundScores || [];
  }

  private calculateTotal(user: User): number {
    return user.currentRound.reduce((sum, score) => sum + score, 0);
  }

  private calculateNetTotal(user: User): number {
    const grossScore = this.calculateTotal(user);
    return grossScore - (user.handicap || 0);
  }

  private calculateHandicap(user: User, date: string): number {
    const round = user.rounds?.find(round =>
      new Date(round.date).toISOString().split('T')[0] ===
      new Date(date).toISOString().split('T')[0]
    );
    return round?.handicap || 0;
  }

  /**
   * Calculate the estimated payouts for 1st, 2nd, and 3rd place in a flight
   * Formula:
   * - Total pot = (players in the flight) × $15
   * - Gross pot = Total pot / 2
   * - Net pot = Total pot / 2
   * - 1st place: 50% of pot
   * - 2nd place: 30% of pot
   * - 3rd place: 20% of pot
   */
  calculatePayouts(flightPlayerCount: number): { first: number; second: number; third: number } {
    const totalPot = flightPlayerCount * 15;
    const halfPot = totalPot / 2; // Split between gross and net

    return {
      first: halfPot * 0.5,   // 50%
      second: halfPot * 0.3,  // 30%
      third: halfPot * 0.2    // 20%
    };
  }

  /**
   * Split users into flights by handicap (lowest handicaps in A flight).
   * Users must already have `handicap` and `currentRound` populated for the round.
   */
  splitIntoFlights(users: User[], numFlights: number): User[][] {
    // Tie-break equal handicaps by name so flight assignment is deterministic
    // regardless of the input ordering (e.g. score-sorted vs. raw user list).
    const sortedByHandicap = [...users].sort((a, b) =>
      ((a.handicap || 0) - (b.handicap || 0)) ||
      (a.name || '').localeCompare(b.name || '')
    );
    const flightSize = Math.ceil(sortedByHandicap.length / numFlights);

    const flights: User[][] = [];
    for (let i = 0; i < numFlights; i++) {
      const flightUsers = sortedByHandicap.slice(i * flightSize, (i + 1) * flightSize);
      if (flightUsers.length > 0) {
        flights.push(flightUsers);
      }
    }
    return flights;
  }

  /**
   * Compare two players by total score. Ties are broken with a scorecard
   * playoff: compare hole scores starting at the hardest handicap hole
   * (handicap 1) and moving to easier holes until the tie is broken.
   * Net comparisons use net hole scores; gross comparisons use gross.
   */
  compareByScoreWithPlayoff(a: User, b: User, useNet: boolean): number {
    const aTotal = useNet ? this.calculateNetTotal(a) : this.calculateTotal(a);
    const bTotal = useNet ? this.calculateNetTotal(b) : this.calculateTotal(b);
    if (aTotal !== bTotal) {
      return aTotal - bTotal;
    }

    for (const holeIndex of this.holesByDifficulty) {
      const aHole = useNet ? this.calculateNetScoreForHole(a, holeIndex) : (a.currentRound[holeIndex] ?? 0);
      const bHole = useNet ? this.calculateNetScoreForHole(b, holeIndex) : (b.currentRound[holeIndex] ?? 0);
      if (aHole !== bHole) {
        return aHole - bHole;
      }
    }

    return 0;
  }

  /**
   * Net score for a specific hole, applying handicap strokes by hole difficulty.
   */
  calculateNetScoreForHole(user: User, holeIndex: number): number {
    if (!user.currentRound || user.currentRound.length <= holeIndex) {
      return 0;
    }

    const grossScore = user.currentRound[holeIndex];
    const userHandicap = user.handicap || 0;
    const holeHandicap = environment.courseHandicapValues[holeIndex];

    let strokesGiven = 0;

    if (userHandicap > 0) {
      // Positive handicap: player gets strokes
      if (userHandicap >= 18) {
        // Gets at least one stroke on every hole
        strokesGiven = 1;
        // Check if they get a second stroke on this hole
        const extraStrokes = userHandicap - 18;
        if (holeHandicap <= extraStrokes) {
          strokesGiven = 2;
        }
      } else {
        // Gets one stroke on the handicap holes up to their handicap
        if (holeHandicap <= userHandicap) {
          strokesGiven = 1;
        }
      }
    } else if (userHandicap < 0) {
      // Negative handicap: player gives strokes (scratch or better)
      // They give strokes on the easiest holes (highest handicap values)
      const strokesToGive = Math.abs(userHandicap);
      if (holeHandicap >= (19 - strokesToGive)) {
        strokesGiven = -1; // Add a stroke
      }
    }

    return grossScore - strokesGiven;
  }

  /**
   * Compute the top-3 gross and top-3 net winners for a flight.
   * A player can only win one position: if a player places in both lists,
   * they keep whichever placing is better (gross wins an equal placing)
   * and the other list moves up.
   */
  computeFlightWinners(
    flightUsers: User[],
    payouts: { first: number; second: number; third: number }
  ): FlightWinners {
    const grossOrder = [...flightUsers].sort((a, b) => this.compareByScoreWithPlayoff(a, b, false));
    const netOrder = [...flightUsers].sort((a, b) => this.compareByScoreWithPlayoff(a, b, true));

    const excludedFromGross = new Set<User>();
    const excludedFromNet = new Set<User>();
    let grossTop: User[] = [];
    let netTop: User[] = [];

    // Iteratively resolve players appearing in both top-3 lists.
    // Only one conflict is resolved per iteration (the player with the
    // best placing), because each resolution shifts the other list up
    // and can change the placings of the remaining conflicted players.
    while (true) {
      grossTop = grossOrder.filter(u => !excludedFromGross.has(u)).slice(0, 3);
      netTop = netOrder.filter(u => !excludedFromNet.has(u)).slice(0, 3);

      const conflicts = grossTop.filter(u => netTop.includes(u));
      if (conflicts.length === 0) {
        break;
      }

      // Pick the conflicted player with the best (lowest) placing
      let player = conflicts[0];
      let bestPlace = Number.MAX_SAFE_INTEGER;
      for (const candidate of conflicts) {
        const place = Math.min(grossTop.indexOf(candidate), netTop.indexOf(candidate)) + 1;
        if (place < bestPlace) {
          bestPlace = place;
          player = candidate;
        }
      }

      const grossPlace = grossTop.indexOf(player) + 1;
      const netPlace = netTop.indexOf(player) + 1;
      if (grossPlace <= netPlace) {
        excludedFromNet.add(player);
      } else {
        excludedFromGross.add(player);
      }
    }

    return {
      gross: grossTop.map((u, i) => this.buildWinner(u, i + 1, false, payouts)),
      net: netTop.map((u, i) => this.buildWinner(u, i + 1, true, payouts))
    };
  }

  private buildWinner(
    user: User,
    place: number,
    useNet: boolean,
    payouts: { first: number; second: number; third: number }
  ): FlightWinner {
    const placeLabels = ['1st', '2nd', '3rd'];
    const payoutsByPlace = [payouts.first, payouts.second, payouts.third];
    return {
      place,
      placeLabel: placeLabels[place - 1] || `${place}th`,
      name: user.name,
      score: useNet ? this.calculateNetTotal(user) : this.calculateTotal(user),
      payout: payoutsByPlace[place - 1] || 0
    };
  }
}
