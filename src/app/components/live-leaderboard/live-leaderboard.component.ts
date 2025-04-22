import { Component, Input } from '@angular/core';
import { User } from '../../../objects/user';
import { TeeTimeService } from '../../services/tee-time.service';

@Component({
  selector: 'app-live-leaderboard',
  standalone: false,
  templateUrl: './live-leaderboard.component.html',
  styleUrl: './live-leaderboard.component.css'
})
export class LiveLeaderboardComponent {
  @Input() refreshTrigger: any; // optional trigger for manual updates
  @Input() selectedDate: string = '';
  @Input() showNet: boolean = false; // NEW: whether to show net scores

  users: User[] = [];
  leaderboard: { name: string, score: number | 'E' }[] = [];
  readonly PAR = 62;

  constructor(private teeTimeService: TeeTimeService) {}

  ngOnInit(): void {
    this.loadLeaderboard();

    // Optional: Refresh if parent triggers update
    if (this.refreshTrigger) {
      this.refreshTrigger.subscribe(() => this.loadLeaderboard());
    }
  }

  loadLeaderboard(): void {
    this.teeTimeService.getUsersFromTeeTimesByDate(this.selectedDate).subscribe({
      next: (users: User[]) => {
        this.users = users;
        this.leaderboard = this.calculateLeaderboard(users);
      },
      error: err => console.error('Failed to load users for leaderboard:', err)
    });
  }

  calculateLeaderboard(users: User[]): { name: string, score: number | 'E' }[] {
    const leaderboard = users.map(user => {
      const total = (user.currentRound || []).reduce((sum, val) => sum + val, 0);
      const gross = total - 62;

      const net = gross - (user.handicap ?? 0); // apply handicap if showNet is true
      const score = this.showNet ? net : gross;

      return {
        name: user.name,
        score: (score === 0 ? 'E' : score) as number | 'E'
      };
    });

    return leaderboard.sort((a, b) => {
      const aScore = a.score === 'E' ? 0 : +a.score;
      const bScore = b.score === 'E' ? 0 : +b.score;
      return aScore - bScore;
    }).slice(0, 10);
  }
}
