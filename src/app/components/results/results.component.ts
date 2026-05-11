import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { User } from '../../../objects/user';
import { TeeTimeService } from '../../services/tee-time.service';
import { LeaderboardService } from '../../services/leaderboard.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-results',
  standalone: false,
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css'],
})
export class ResultsComponent implements OnInit {
  usersWithScores: User[] = [];
  flights: { name: string; users: User[]; skinsPlayerCount: number; skinsTotalPot: number; skinsPayoutPerSkin: number }[] = [];
  displayDate: string = '';
  tournamentFormat: string = '';
  private targetDate: string = '';
  parValues: number[] = environment.parValues;
  holeHandicapValues: number[] = [9, 5, 3, 11, 17, 13, 15, 7, 1, 4, 14, 10, 12, 8, 6, 16, 18, 2];
  showNetLeaderboard: boolean = true;
  private flightNames: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  private numFlights: number = 2;

  // Payout estimates
  payouts: { first: number; second: number; third: number } = { first: 0, second: 0, third: 0 };

  constructor(
    private route: ActivatedRoute,
    private teeTimeService: TeeTimeService,
    private leaderboardService: LeaderboardService
  ) {}

  ngOnInit(): void {
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

  toggleLeaderboard(): void {
    this.showNetLeaderboard = !this.showNetLeaderboard;
    this.sortUsers();
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

      this.splitIntoFlights();
      this.calculateAllFlightSkinsPayouts();
    });
  }

  private splitIntoFlights(): void {
    // Sort all users by handicap (lowest first)
    const sortedByHandicap = [...this.usersWithScores].sort((a, b) =>
      (a.handicap || 0) - (b.handicap || 0)
    );

    const numFlights = this.numFlights;
    const flightSize = Math.ceil(sortedByHandicap.length / numFlights);

    // Create dynamic flights based on environment variable
    this.flights = [];
    for (let i = 0; i < numFlights; i++) {
      const startIndex = i * flightSize;
      const endIndex = Math.min(startIndex + flightSize, sortedByHandicap.length);
      const flightUsers = sortedByHandicap.slice(startIndex, endIndex);

      if (flightUsers.length > 0) {
        this.flights.push({
          name: this.flightNames[i] || `Flight ${i + 1}`,
          users: flightUsers,
          skinsPlayerCount: 0,
          skinsTotalPot: 0,
          skinsPayoutPerSkin: 0
        });
      }
    }

    // Calculate payouts based on A flight player count
    const aFlightPlayerCount = this.flights.length > 0 ? this.flights[0].users.length : 0;
    this.payouts = this.leaderboardService.calculatePayouts(aFlightPlayerCount);

    // Sort each flight by score
    this.sortFlights();
  }

  private sortFlights(): void {
    const sortByScore = (a: User, b: User) => {
      const aScore = this.showNetLeaderboard ? this.calculateNetTotal(a) : this.calculateTotal(a);
      const bScore = this.showNetLeaderboard ? this.calculateNetTotal(b) : this.calculateTotal(b);
      return aScore - bScore;
    };

    this.flights.forEach(flight => flight.users.sort(sortByScore));
  }

  // Check if user paid skins for this date
  userPaidSkins(user: User): boolean {
    const round = user.rounds?.find(r =>
      new Date(r.date).toISOString().split('T')[0] ===
      new Date(this.targetDate).toISOString().split('T')[0]
    );
    return round?.paidSkins === true;
  }

  private sortUsers(): void {
    this.sortFlights();
  }

  private getRoundForDate(user: User): number[] {
    const round = user.rounds?.find(round =>
      new Date(round.date).toISOString().split('T')[0] ===
      new Date(this.targetDate).toISOString().split('T')[0]
    );
    return round?.roundScores || [];
  }

  private calculateHandicap(user: User): number {
    const round = user.rounds?.find(round =>
      new Date(round.date).toISOString().split('T')[0] ===
      new Date(this.targetDate).toISOString().split('T')[0]
    );
    return round?.handicap || 0;
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
    if (!user.currentRound || user.currentRound.length <= holeIndex) {
      return 0;
    }

    const grossScore = user.currentRound[holeIndex];
    const userHandicap = user.handicap || 0;
    const holeHandicap = this.holeHandicapValues[holeIndex];

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

    const userRound = user.rounds?.find(r =>
      new Date(r.date).toISOString().split('T')[0] ===
      new Date(this.targetDate).toISOString().split('T')[0]
    );

    if (!userRound?.paidSkins) {
      return false;
    }

    const userScore = this.showNetLeaderboard
      ? this.calculateNetScoreForHole(user, i)
      : user.currentRound[i];

    // Only compare against eligible players within the same flight
    const eligiblePlayers = flightUsers.filter(u => {
      const round = u.rounds?.find(r =>
        new Date(r.date).toISOString().split('T')[0] ===
        new Date(this.targetDate).toISOString().split('T')[0]
      );
      return round?.paidSkins === true;
    });

    const allScoresForHole = eligiblePlayers.map(u =>
      this.showNetLeaderboard
        ? this.calculateNetScoreForHole(u, i)
        : u.currentRound[i]
    ).filter(score => score !== undefined);

    const minScore = Math.min(...allScoresForHole);
    const isUniqueMin = userScore === minScore && allScoresForHole.filter(score => score === minScore).length === 1;

    return isUniqueMin;
  }

  // Backward-compatible wrapper that finds the user's flight
  skins(i: number, user: User): boolean {
    const flight = this.flights.find(f => f.users.includes(user));
    return flight ? this.skinsForFlight(i, user, flight.users) : false;
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

  /**
   * Calculate skins payouts per flight
   * Each flight has its own pot from its own skins-paying players
   */
  private calculateAllFlightSkinsPayouts(): void {
    this.flights.forEach(flight => {
      flight.skinsPlayerCount = flight.users.filter(user => {
        const round = user.rounds?.find(r =>
          new Date(r.date).toISOString().split('T')[0] ===
          new Date(this.targetDate).toISOString().split('T')[0]
        );
        return round?.paidSkins === true;
      }).length;

      flight.skinsTotalPot = flight.skinsPlayerCount * 10;

      const skinsCount = this.getSkinsListForFlight(flight).length;
      flight.skinsPayoutPerSkin = skinsCount > 0 ? flight.skinsTotalPot / skinsCount : 0;
    });
  }
}
