import { Component } from '@angular/core';
import { User } from '../../../objects/user';
import { TournamentService } from '../../services/tournament.service';
import { LeaderboardService } from '../../services/leaderboard.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  netLeaderboard: { name: string; netscore: number; }[] = [];
  grossLeaderboard: { name: string; grossscore: number; }[] = [];
  lastTournamentDate: string = '';
  nextTournamentDate: string = '';
  targetAmountHoleInOne = environment.holeInOnePot; // Final amount to display

  holeInOneDisplay = 0;    // Value that animates

  constructor(private leaderboardService: LeaderboardService,
    private tournamentService: TournamentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.animateCountUp(); // Start the count-up animation
    this.lastTournamentDate = this.tournamentService.getMostRecentTournamentDate();
    this.nextTournamentDate = this.tournamentService.getNextTournamentDate();
    this.leaderboardService.getNetLeaderboardForDate(this.lastTournamentDate).subscribe((users: User[]) => {
      this.netLeaderboard = users.slice(0, 5).map(user => ({
        name: user.name,
        netscore: this.calculateNet(user)
      }));
    });

    this.leaderboardService.getGrossLeaderboardForDate(this.lastTournamentDate).subscribe((users: User[]) => {
      this.grossLeaderboard = users.slice(0, 5).map(user => ({
        name: user.name,
        grossscore: this.calculateGross(user)
      }));
    });
  }

  ngOnDestroy(): void {
    // Clear the interval if the component is destroyed to prevent memory leaks
    if (this.holeInOneDisplay) {
      clearInterval(this.holeInOneDisplay);
    }
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

  goToSignUp(): void {
    const date = new Date(this.nextTournamentDate).toISOString().split('T')[0]; // Get date in YYYY-MM-DD format
    this.router.navigate(['/teesheet', date]);
  }

  private calculateGross(user: User): number {
    return user.currentRound?.reduce((sum, score) => sum + score, 0) || 0;
  }

  private calculateNet(user: User): number {
    return this.calculateGross(user) - (user.handicap || 0);
  }

  animateCountUp(): void {
    const duration = 2500; // total animation time in ms
    const frameRate = 40;  // ms between each step
    const totalSteps = duration / frameRate;
    const increment = this.targetAmountHoleInOne / totalSteps;

    const counter = setInterval(() => {
      this.holeInOneDisplay += increment;
      if (this.holeInOneDisplay >= this.targetAmountHoleInOne) {
        this.holeInOneDisplay = this.targetAmountHoleInOne;
        clearInterval(counter);
      }
    }, frameRate);
  }
}
