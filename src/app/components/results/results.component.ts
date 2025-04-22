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
  showNetLeaderboard: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private teeTimeService: TeeTimeService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.targetDate = params['date']; // Get the date parameter from the route
      this.displayDate = new Date(this.targetDate).toLocaleDateString(); // Convert to a readable format
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
        currentRound: this.getRoundForDate(user)
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

  skins(i: number, user: User): boolean {
    if (!user.currentRound || user.currentRound.length <= i) {
      return false;
    }

    const userScore = user.currentRound[i];
    const allScoresForHole = this.usersWithScores.map(u => u.currentRound[i]).filter(score => score !== undefined);
    const minScore = Math.min(...allScoresForHole);
    const isUniqueMin = userScore === minScore && allScoresForHole.filter(score => score === minScore).length === 1;

    return isUniqueMin;
  }
}
