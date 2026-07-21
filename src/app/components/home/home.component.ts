import { Component, OnDestroy, OnInit } from '@angular/core';
import { User } from '../../../objects/user';
import { TournamentService } from '../../services/tournament.service';
import { LeaderboardService, FlightWinners } from '../../services/leaderboard.service';
import { TeeTimeService } from '../../services/tee-time.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface HomeFlight {
  name: string;
  winners: FlightWinners;
}

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  flights: HomeFlight[] = [];
  lastTournamentDate: string = '';
  nextTournamentDate: string = '';
  nextTournamentFormat: string = '';
  daysUntilNext: number | null = null;
  targetAmountHoleInOne = 0;

  holeInOneDisplay = 0;    // Value that animates
  private counterInterval?: ReturnType<typeof setInterval>;

  private flightNames: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  constructor(private leaderboardService: LeaderboardService,
    private tournamentService: TournamentService,
    private teeTimeService: TeeTimeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchHoleInOnePot();
    this.lastTournamentDate = this.tournamentService.getMostRecentTournamentDate();
    this.nextTournamentDate = this.tournamentService.getNextTournamentDate();
    this.loadNextTournamentInfo();
    this.loadLastTournamentWinners();
  }

  ngOnDestroy(): void {
    // Clear the interval if the component is destroyed to prevent memory leaks
    if (this.counterInterval) {
      clearInterval(this.counterInterval);
    }
  }

  private loadNextTournamentInfo(): void {
    if (!this.nextTournamentDate) {
      return;
    }
    const tournament = environment.tournamentDates.find(t => t.date === this.nextTournamentDate);
    this.nextTournamentFormat = tournament?.format || 'Stroke Play';

    const [year, month, day] = this.nextTournamentDate.split('-').map(Number);
    const next = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.daysUntilNext = Math.round((next.getTime() - today.getTime()) / 86400000);
  }

  private loadLastTournamentWinners(): void {
    if (!this.lastTournamentDate) {
      return;
    }
    const tournament = environment.tournamentDates.find(t => t.date === this.lastTournamentDate);
    const numFlights = tournament?.Flights || 2;

    this.leaderboardService.getNetLeaderboardForDate(this.lastTournamentDate).subscribe((users: User[]) => {
      const flightGroups = this.leaderboardService.splitIntoFlights(users, numFlights);

      this.flights = flightGroups.map((flightUsers, i) => ({
        name: this.flightNames[i] || `${i + 1}`,
        winners: this.leaderboardService.computeFlightWinners(
          flightUsers,
          // Each flight's payouts are based on its own player count
          this.leaderboardService.calculatePayouts(flightUsers.length)
        )
      }));
    });
  }

  getFormattedDate(dateString: string): string {
    if (!dateString) {
      return '';
    }
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  goToFullResults(): void {
    this.router.navigate(['/results', this.lastTournamentDate]);
  }

  goToSignUp(): void {
    this.router.navigate(['/teesheet', this.nextTournamentDate]);
  }

  goToSchedule(): void {
    this.router.navigate(['/schedule']);
  }

  goToLeaderboard(): void {
    this.router.navigate(['/leaderboard']);
  }

  fetchHoleInOnePot(): void {
    this.teeTimeService.getHoleInOnePot().subscribe({
      next: (response) => {
        this.targetAmountHoleInOne = response.amount;
        this.animateCountUp();
      },
      error: (err) => {
        console.error('Error fetching hole-in-one pot:', err);
      }
    });
  }

  animateCountUp(): void {
    const duration = 2000; // total animation time in ms
    const frameRate = 40;  // ms between each step
    const totalSteps = duration / frameRate;
    const increment = this.targetAmountHoleInOne / totalSteps;

    this.counterInterval = setInterval(() => {
      this.holeInOneDisplay += increment;
      if (this.holeInOneDisplay >= this.targetAmountHoleInOne) {
        this.holeInOneDisplay = this.targetAmountHoleInOne;
        clearInterval(this.counterInterval);
      }
    }, frameRate);
  }
}
