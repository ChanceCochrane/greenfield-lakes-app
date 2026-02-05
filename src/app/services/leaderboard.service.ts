import { Injectable } from '@angular/core';
import { User } from '../../objects/user';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { TeeTimeService } from './tee-time.service';

@Injectable({
  providedIn: 'root',
})
export class LeaderboardService {
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
   * Calculate the estimated payouts for 1st, 2nd, and 3rd place
   * Formula:
   * - Total pot = (A flight players) × $15
   * - Gross pot = Total pot / 2
   * - Net pot = Total pot / 2
   * - 1st place: 50% of pot
   * - 2nd place: 30% of pot
   * - 3rd place: 20% of pot
   */
  calculatePayouts(aFlightPlayerCount: number): { first: number; second: number; third: number } {
    const totalPot = aFlightPlayerCount * 15;
    const halfPot = totalPot / 2; // Split between gross and net

    return {
      first: halfPot * 0.5,   // 50%
      second: halfPot * 0.3,  // 30%
      third: halfPot * 0.2    // 20%
    };
  }
}
