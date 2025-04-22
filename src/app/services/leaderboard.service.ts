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

  getLeaderboardForDate(date: string): Observable<User[]> {
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
          .sort((a, b) => this.calculateNetTotal(a) - this.calculateNetTotal(b))
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
}
