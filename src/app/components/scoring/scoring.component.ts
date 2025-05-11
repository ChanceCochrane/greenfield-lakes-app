import { Component } from '@angular/core';
import { User } from '../../../objects/user';
import { TeeTimeService } from '../../services/tee-time.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-scoring',
  standalone: false,
  templateUrl: './scoring.component.html',
  styleUrl: './scoring.component.css'
})
export class ScoringComponent {
  teeTimes: any[] = [];
  selectedGroup: string | null = null;
  groupUsers: User[] = [];
  allUsers: User[] = [];
  holeIndex: number = 0;
  selectedGroupId: string | null = null;
  selectedUsers: any[] = [];
  leaderboardTrigger = new Subject<void>();
  selectedDate: Date = new Date(); // TO DO: Set this to todays date so the leaderboard is only visible on tourney day
  selectedDateString: string = '';
  initializeRound = [3, 4, 5, 3, 3, 3, 3, 3, 5, 4, 3, 3, 3, 3, 4, 3, 3, 4];

  constructor(private teeTimeService: TeeTimeService) {}

  ngOnInit(): void {
    this.selectedDateString = this.formatDate(this.selectedDate);

    this.teeTimeService.getTeeTimesByDate(this.selectedDateString).subscribe({
      next: (response: any) => {
        if (response.message) {
          this.teeTimes = [];
        } else {
          this.teeTimes = response.map((teeTime: any, index: number) => {
            const lastNames = teeTime.users.map((user: string) => user.split(' ').pop());
            return {
              id: index,
              users: teeTime.users,
              displayUsers: lastNames.join(', ')
            };
          });
        }
      },
      error: () => (this.teeTimes = [])
    });

    this.teeTimeService.getUsersFromTeeTimesByDate(this.selectedDateString).subscribe({
      next: (users) => {
        this.allUsers = users;
        if (this.allUsers?.length > 0) {
          this.allUsers.forEach((user) => {
            if (user.currentRound == null || user.currentRound.length === 0) {
              this.teeTimeService.updateUser({
                name: user.name,
                currentRound: this.initializeRound,
              }).subscribe(
                this.leaderboardTrigger.next.bind(this.leaderboardTrigger), // trigger leaderboard update
                (err) => console.error(`Error initializing round for ${user.name}:`, err)
              );
            }
          });
        }
      },
      error: (err) => {
        console.error('Failed to load filtered users:', err);
        this.allUsers = [];
      }
    });
  }

  onGroupSelect(event: Event): void {
    const selectedId = (event.target as HTMLSelectElement).value;
    const index = parseInt(selectedId, 10);
    this.selectedGroupId = selectedId; // Keep for UI highlighting if needed
    this.loadSelectedGroup(index);
  }

  loadSelectedGroup(index: number): void {
    const group = this.teeTimes[index];
    if (!group) return;

    this.teeTimeService.getUsers().subscribe({
      next: (allUsers) => {
        this.selectedUsers = group.users.map((name: string) =>
          allUsers.find((user: any) => user.name === name)
        ).filter(Boolean); // Just in case some names aren’t found
      },
      error: (err) => console.error('Failed to load users:', err)
    });
  }

  incrementHole() {
    if (this.holeIndex < 20) this.holeIndex++;
  }

  decrementHole() {
    if (this.holeIndex > 0) this.holeIndex--;
  }

  adjustScore(user: any, delta: number): void {
    if (!user.currentRound) return;

    // Make sure currentRound exists and is long enough
    while (user.currentRound.length <= this.holeIndex) {
      user.currentRound.push(0); // Initialize missing holes
    }
    let hole = this.holeIndex;
    if (this.holeIndex >= 10) {
      hole = this.holeIndex - 1;
    }

    // Get the current score
    let currentScore = user.currentRound[hole];

    // Calculate the new score with the delta adjustment
    let newScore = currentScore + delta;

    // Ensure the new score is between 1 and 10 (inclusive)
    if (newScore < 1) {
      newScore = 1;
    } else if (newScore > 10) {
      newScore = 10;
    }
    // If the score didn't actually change, return early
    if (newScore === currentScore) {
      return;
    }
    user.currentRound[hole] = newScore;

    // Call service to update this user's score
    this.teeTimeService.updateUserScore(user.name, hole, newScore).subscribe({
      next: () => {
        this.leaderboardTrigger.next(); // trigger leaderboard update
      },
      error: err => console.error(`Error updating score for ${user.name}:`, err)
    });
  }

  getFrontNineTotal(user: any): number {
    return (user.currentRound ?? []).slice(0, 9).reduce((sum: any, val: any) => sum + (val || 0), 0);
  }

  getBackNineTotal(user: any): number {
    return (user.currentRound ?? []).slice(9, 18).reduce((sum: any, val: any) => sum + (val || 0), 0);
  }

  getTotalScore(user: any): number {
    return this.getFrontNineTotal(user) + this.getBackNineTotal(user);
  }

  formatDate(date: Date): string {
    // Create a date in MST (UTC-7) without manual hour adjustment
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Phoenix', // Arizona time zone
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // Format the date as YYYY-MM-DD
    const [{ value: month }, , { value: day }, , { value: year }] = formatter.formatToParts(date);
    return `${year}-${month}-${day}`;
  }
}
