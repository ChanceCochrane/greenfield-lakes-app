import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { User } from '../../../objects/user';
import { TeeTimeService } from '../../services/tee-time.service';
import { LeaderboardService, FlightWinners } from '../../services/leaderboard.service';
import { environment } from '../../../environments/environment';

interface Flight {
  name: string;
  users: User[];
  skinsPlayerCount: number;
  skinsTotalPot: number;
  skinsPayoutPerSkin: number;
  winners: FlightWinners;
}

@Component({
  selector: 'app-results',
  standalone: false,
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css'],
})
export class ResultsComponent implements OnInit {
  usersWithScores: User[] = [];
  flights: Flight[] = [];
  displayDate: string = '';
  tournamentFormat: string = '';
  private targetDate: string = '';
  parValues: number[] = environment.parValues;
  showNetLeaderboard: boolean = true;
  selectedFlightIndex: number = 0;
  private flightNames: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  private numFlights: number = 2;

  constructor(
    private route: ActivatedRoute,
    private teeTimeService: TeeTimeService,
    private leaderboardService: LeaderboardService
  ) {}

  ngOnInit(): void {
    // Scroll to top immediately, before the view renders, to avoid a
    // visible jump after the page loads
    window.scrollTo(0, 0);
    this.route.params.subscribe(params => {
      this.targetDate = params['date']; // Get the date parameter from the route
      const [year, month, day] = this.targetDate.split('-').map(Number);
      this.displayDate = new Date(year, month - 1, day).toLocaleDateString();
      const tournament = environment.tournamentDates.find(t => t.date === this.targetDate);
      this.tournamentFormat = tournament?.format || 'Stroke Play';
      this.numFlights = tournament?.Flights || 2;
      this.loadScores();
    });
  }

  get selectedFlight(): Flight | null {
    return this.flights[this.selectedFlightIndex] || null;
  }

  selectFlight(index: number): void {
    this.selectedFlightIndex = index;
  }

  setScoreMode(useNet: boolean): void {
    if (this.showNetLeaderboard === useNet) {
      return;
    }
    this.showNetLeaderboard = useNet;
    this.sortFlights();
    this.calculateAllFlightSkinsPayouts();
  }

  private loadScores(): void {
    this.teeTimeService.getUsers().subscribe(users => {
      this.usersWithScores = users.filter(user =>
        user.rounds?.some(round =>
          new Date(round.date).toISOString().split('T')[0] ===
          new Date(this.targetDate).toISOString().split('T')[0]
        )
      ).map(user => ({
        ...user,
        currentRound: this.getRoundForDate(user),
        handicap: this.calculateHandicap(user),
      }));

      this.selectedFlightIndex = 0;
      this.splitIntoFlights();
      this.calculateAllFlightSkinsPayouts();
      this.computeFlightWinners();
    });
  }

  /** Find the user's round for the tournament date being displayed. */
  private findRound(user: User) {
    const target = new Date(this.targetDate).toISOString().split('T')[0];
    return user.rounds?.find(r =>
      new Date(r.date).toISOString().split('T')[0] === target
    );
  }

  private splitIntoFlights(): void {
    const flightGroups = this.leaderboardService.splitIntoFlights(this.usersWithScores, this.numFlights);

    this.flights = flightGroups.map((flightUsers, i) => ({
      name: this.flightNames[i] || `${i + 1}`,
      users: flightUsers,
      skinsPlayerCount: 0,
      skinsTotalPot: 0,
      skinsPayoutPerSkin: 0,
      winners: { gross: [], net: [] }
    }));

    // Sort each flight by score
    this.sortFlights();
  }

  private sortFlights(): void {
    const useNet = this.showNetLeaderboard;
    this.flights.forEach(flight =>
      flight.users.sort((a, b) => this.leaderboardService.compareByScoreWithPlayoff(a, b, useNet))
    );
  }

  private computeFlightWinners(): void {
    this.flights.forEach(flight => {
      // Each flight's payouts are based on its own player count
      const payouts = this.leaderboardService.calculatePayouts(flight.users.length);
      flight.winners = this.leaderboardService.computeFlightWinners(flight.users, payouts);
    });
  }

  // Check if user paid skins for this date
  userPaidSkins(user: User): boolean {
    return this.findRound(user)?.paidSkins === true;
  }

  private getRoundForDate(user: User): number[] {
    return this.findRound(user)?.roundScores || [];
  }

  private calculateHandicap(user: User): number {
    return this.findRound(user)?.handicap || 0;
  }

  calculateTotal(user: User): number {
    return user.currentRound.reduce((sum, score) => sum + score, 0);
  }

  calculateNetTotal(user: User): number {
    const grossScore = this.calculateTotal(user);
    return grossScore - (user.handicap || 0);
  }

  calculateParTotal(): number {
    return this.parValues.reduce((sum, p) => sum + p, 0);
  }

  // Calculate net score for a specific hole for a specific user
  calculateNetScoreForHole(user: User, holeIndex: number): number {
    return this.leaderboardService.calculateNetScoreForHole(user, holeIndex);
  }

  // Get the display score for a hole (gross or net based on current leaderboard)
  getDisplayScoreForHole(user: User, holeIndex: number): number {
    if (this.showNetLeaderboard) {
      return this.calculateNetScoreForHole(user, holeIndex);
    } else {
      return user.currentRound[holeIndex] || 0;
    }
  }

  // Flight-scoped skins: checks if a user won a skin on hole i within their flight
  skinsForFlight(i: number, user: User, flightUsers: User[]): boolean {
    if (!user.currentRound || user.currentRound.length <= i) {
      return false;
    }

    if (!this.userPaidSkins(user)) {
      return false;
    }

    const userScore = this.showNetLeaderboard
      ? this.calculateNetScoreForHole(user, i)
      : user.currentRound[i];

    // Only compare against eligible players within the same flight
    const eligiblePlayers = flightUsers.filter(u => this.userPaidSkins(u));

    const allScoresForHole = eligiblePlayers.map(u =>
      this.showNetLeaderboard
        ? this.calculateNetScoreForHole(u, i)
        : u.currentRound[i]
    ).filter(score => score !== undefined);

    const minScore = Math.min(...allScoresForHole);
    const isUniqueMin = userScore === minScore && allScoresForHole.filter(score => score === minScore).length === 1;

    return isUniqueMin;
  }

  // Get skins list scoped to a specific flight
  getSkinsListForFlight(flight: { name: string; users: User[] }): { player: string; hole: number }[] {
    const skinsList: { player: string; hole: number }[] = [];
    flight.users.forEach((user) => {
      user.currentRound.forEach((score, i) => {
        if (this.skinsForFlight(i, user, flight.users)) {
          skinsList.push({ player: user.name, hole: i + 1 });
        }
      });
    });
    return skinsList.sort((a, b) => a.hole - b.hole);
  }

  // Skins grouped by player (one row per player), most skins first
  getGroupedSkinsForFlight(flight: { name: string; users: User[] }): { player: string; holes: number[] }[] {
    const grouped = new Map<string, number[]>();
    this.getSkinsListForFlight(flight).forEach(skin => {
      const holes = grouped.get(skin.player) || [];
      holes.push(skin.hole);
      grouped.set(skin.player, holes);
    });
    return Array.from(grouped, ([player, holes]) => ({ player, holes }))
      .sort((a, b) => b.holes.length - a.holes.length || a.holes[0] - b.holes[0]);
  }

  /**
   * Calculate skins payouts per flight
   * Each flight has its own pot from its own skins-paying players
   */
  private calculateAllFlightSkinsPayouts(): void {
    this.flights.forEach(flight => {
      flight.skinsPlayerCount = flight.users.filter(user => this.userPaidSkins(user)).length;

      flight.skinsTotalPot = flight.skinsPlayerCount * 10;

      const skinsCount = this.getSkinsListForFlight(flight).length;
      flight.skinsPayoutPerSkin = skinsCount > 0 ? flight.skinsTotalPot / skinsCount : 0;
    });
  }
}
