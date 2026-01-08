import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { User } from '../../../objects/user';
import { TeeTimeService } from '../../services/tee-time.service';

@Component({
  selector: 'app-results',
  standalone: false,
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css'],
})
export class ResultsComponent implements OnInit {
  usersWithScores: User[] = [];
  displayDate: string = '';
  private targetDate: string = '';
  parValues: number[] = [3, 4, 5, 3, 3, 3, 3, 3, 5, 4, 3, 3, 3, 3, 4, 3, 3, 4];
  holeHandicapValues: number[] = [9, 5, 3, 11, 17, 13, 15, 7, 1, 4, 14, 10, 12, 8, 6, 16, 18, 2];
  showNetLeaderboard: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private teeTimeService: TeeTimeService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.targetDate = params['date']; // Get the date parameter from the route
      const [year, month, day] = this.targetDate.split('-').map(Number);
      this.displayDate = new Date(year, month - 1, day).toLocaleDateString();
      this.loadScores();
    });
  }

  toggleLeaderboard(): void {
    this.showNetLeaderboard = !this.showNetLeaderboard;
    this.sortUsers();
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
      })).sort((a, b) => this.calculateNetTotal(a) - this.calculateNetTotal(b)); // Sort lowest net score first
    });
  }

  private sortUsers(): void {
    this.usersWithScores.sort((a, b) => {
      const aScore = this.showNetLeaderboard ? this.calculateNetTotal(a) : this.calculateTotal(a);
      const bScore = this.showNetLeaderboard ? this.calculateNetTotal(b) : this.calculateTotal(b);
      return aScore - bScore;
    });
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

  // Updated skins method to use net scores when net leaderboard is shown
  skins(i: number, user: User): boolean {
    if (!user.currentRound || user.currentRound.length <= i) {
      return false;
    }

    // First check if the current user paid for skins
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

    // Here we need to filter out the players that did not pay to play skins
    const eligiblePlayers = this.usersWithScores.filter(u => {
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

  // Updated method to generate and sort skins list by hole number
  getSkinsList(): { player: string; hole: number }[] {
    const skinsList: { player: string; hole: number }[] = [];
    this.usersWithScores.forEach((user) => {
      user.currentRound.forEach((score, i) => {
        if (this.skins(i, user)) {
          skinsList.push({ player: user.name, hole: i + 1 }); // Hole numbers are 1-based
        }
      });
    });
    // Sort by hole number (ascending: Hole 1 to Hole 18)
    return skinsList.sort((a, b) => a.hole - b.hole);
  }
}
