import { Component } from '@angular/core';
import { User } from '../../../objects/user';
import { TournamentService } from '../../services/tournament.service';
import { LeaderboardService } from '../../services/leaderboard.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  leaderboard: { name: string; netscore: number; grossscore: number }[] = [];
  lastTournamentDate: string = '';

  constructor(private leaderboardService: LeaderboardService,
    private tournamentService: TournamentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.lastTournamentDate = this.tournamentService.getMostRecentTournamentDate();
    this.leaderboardService.getLeaderboardForDate(this.lastTournamentDate).subscribe((users: User[]) => {
      this.leaderboard = users.slice(0, 10).map(user => ({
        name: user.name,
        netscore: this.calculateNet(user),
        grossscore: this.calculateGross(user),
      }));
    });
  }

  getFormattedDate(dateString: string): string {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  goToFullResults(): void {
    const date = new Date(this.lastTournamentDate).toISOString().split('T')[0]; // Get date in YYYY-MM-DD format
    this.router.navigate(['/results', date]);
  }

  private calculateGross(user: User): number {
    return user.currentRound?.reduce((sum, score) => sum + score, 0) || 0;
  }

  private calculateNet(user: User): number {
    return this.calculateGross(user) - (user.handicap || 0);
  }
}
