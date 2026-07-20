import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { User } from '../../../objects/user';
import { TeeTimeService } from '../../services/tee-time.service';
import { LeaderboardService } from '../../services/leaderboard.service';
import { environment } from '../../../environments/environment';

interface FlightWinner {
  place: number;
  placeLabel: string;
  name: string;
  score: number;
  payout: number;
}

interface Flight {
  name: string;
  users: User[];
  skinsPlayerCount: number;
  skinsTotalPot: number;
  skinsPayoutPerSkin: number;
  winners: { gross: FlightWinner[]; net: FlightWinner[] };
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
  holeHandicapValues: number[] = environment.courseHandicapValues;
  // Hole indexes ordered from hardest (handicap 1) to easiest, used for scorecard playoffs
  private holesByDifficulty: number[] = environment.courseHandicapValues
    .map((hcp: number, idx: number) => ({ hcp, idx }))
    .sort((a: { hcp: number; idx: number }, b: { hcp: number; idx: number }) => a.hcp - b.hcp)
    .map((h: { hcp: number; idx: number }) => h.idx);
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
      this.computeFlightWinners();
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
          skinsPayoutPerSkin: 0,
          winners: { gross: [], net: [] }
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
    const useNet = this.showNetLeaderboard;
    this.flights.forEach(flight =>
      flight.users.sort((a, b) => this.compareByScoreWithPlayoff(a, b, useNet))
    );
  }

  /**
   * Compare two players by total score. Ties are broken with a scorecard
   * playoff: compare hole scores starting at the hardest handicap hole
   * (handicap 1) and moving to easier holes until the tie is broken.
   * Net comparisons use net hole scores; gross comparisons use gross.
   */
  private compareByScoreWithPlayoff(a: User, b: User, useNet: boolean): number {
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
   * Compute the top-3 gross and top-3 net winners for each flight.
   * A player can only win one position: if a player places in both lists,
   * they keep whichever placing is better (gross wins an equal placing)
   * and the other list moves up.
   */
  private computeFlightWinners(): void {
    this.flights.forEach(flight => {
      const grossOrder = [...flight.users].sort((a, b) => this.compareByScoreWithPlayoff(a, b, false));
      const netOrder = [...flight.users].sort((a, b) => this.compareByScoreWithPlayoff(a, b, true));

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

      flight.winners = {
        gross: grossTop.map((u, i) => this.buildWinner(u, i + 1, false)),
        net: netTop.map((u, i) => this.buildWinner(u, i + 1, true))
      };
    });
  }

  private buildWinner(user: User, place: number, useNet: boolean): FlightWinner {
    const placeLabels = ['1st', '2nd', '3rd'];
    const payoutsByPlace = [this.payouts.first, this.payouts.second, this.payouts.third];
    return {
      place,
      placeLabel: placeLabels[place - 1] || `${place}th`,
      name: user.name,
      score: useNet ? this.calculateNetTotal(user) : this.calculateTotal(user),
      payout: payoutsByPlace[place - 1] || 0
    };
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
