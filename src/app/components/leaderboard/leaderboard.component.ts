import { Component } from '@angular/core';
import { User, Round } from '../../../objects/user';
import { TeeTimeService } from '../../services/tee-time.service';
import { environment } from '../../../environments/environment';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-leaderboard',
  standalone: false,
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.css'
})
export class LeaderboardComponent {
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
  leaderboardView: 'net' | 'gross' = 'net';
  selectedTeeTimeIndex: number | null = null;
  groupFilter: string = '';
  groupDropdownOpen: boolean = false;
  selectedGroupLabel: string | null = null;

  // Player Stats & POTY
  potypUsers: User[] = [];
  allSearchUsers: User[] = [];
  searchTerm: string = '';
  filteredUsers: User[] = [];
  selectedUser: User | null = null;
  parValues: number[] = environment.parValues;
  avgPar3Score: number = 0;
  avgPar4Score: number = 0;
  avgPar5Score: number = 0;

  constructor(private teeTimeService: TeeTimeService) {}

  ngOnInit(): void {
    this.selectedDateString = this.formatDate(this.selectedDate);

    this.teeTimeService.getTeeTimesByDate(this.selectedDateString).subscribe({
      next: (response: any) => {
        if (response.message) {
          this.teeTimes = [];
        }
        else {
            // Filter out tee times with no users before mapping
            this.teeTimes = response.filter((teeTime: any) => Array.isArray(teeTime.users) && teeTime.users.length > 0)
            .map((teeTime: any, index: number) => {
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

    // Load all users for POTY leaderboard and player search
    this.teeTimeService.getUsers().subscribe(
      (users: any[]) => {
        this.allSearchUsers = users.map(user => {
          user.handicap = user.handicap ?? 0;
          user.paidSkins = user.paidSkins ?? false;
          user.yearlyPoints = user.yearlyPoints ?? 0;
          user.yearlyEarnings = user.yearlyEarnings ?? 0;
          return user;
        });
        this.potypUsers = [...this.allSearchUsers]
          .sort((a, b) => (b.yearlyPoints ?? 0) - (a.yearlyPoints ?? 0))
          .slice(0, 35);
      },
      error => console.error('Error fetching users:', error)
    );
  }

  get visibleTeeTimes(): any[] {
    const term = this.groupFilter.trim().toLowerCase();
    // Show the full list when empty or still displaying the chosen group's name
    if (!term || this.groupFilter === this.selectedGroupLabel) return this.teeTimes;
    return this.teeTimes.filter((teeTime: any) =>
      teeTime.users.some((name: string) => name.toLowerCase().includes(term))
    );
  }

  openGroupDropdown(): void {
    this.groupDropdownOpen = true;
  }

  closeGroupDropdown(): void {
    this.groupDropdownOpen = false;
    // Restore the selected group's name if the user typed but didn't pick anything
    if (this.selectedGroupLabel) {
      this.groupFilter = this.selectedGroupLabel;
    }
  }

  clearGroupFilter(): void {
    this.groupFilter = '';
    this.groupDropdownOpen = true;
  }

  selectGroup(teeTime: any): void {
    this.selectedGroupId = String(teeTime.id);
    this.selectedTeeTimeIndex = teeTime.id;
    this.selectedGroupLabel = teeTime.displayUsers;
    this.groupFilter = teeTime.displayUsers;
    this.groupDropdownOpen = false;
    this.loadSelectedGroup(teeTime.id);
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

  setLeaderboardView(view: 'net' | 'gross'): void {
    this.leaderboardView = view;
  }

  // Player Stats methods
  onSearchChange(): void {
    if (this.searchTerm.trim() === '') {
      this.filteredUsers = [];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.allSearchUsers.filter(user =>
      user.name.toLowerCase().includes(term)
    );
  }

  selectUser(user: User): void {
    this.selectedUser = user;
    this.searchTerm = user.name;
    this.filteredUsers = [];
    this.calculateAveragesByPar();
  }

  clearSelection(): void {
    this.selectedUser = null;
    this.searchTerm = '';
    this.filteredUsers = [];
    this.avgPar3Score = 0;
    this.avgPar4Score = 0;
    this.avgPar5Score = 0;
  }

  getScoreClass(score: number, holeIndex: number): string {
    const par = this.parValues[holeIndex];
    if (score <= par - 1) return 'birdie-circle';
    if (score >= par + 1) return 'bogey-square';
    return '';
  }

  calculateRoundTotal(round: Round): number {
    return round.roundScores.reduce((sum, score) => sum + score, 0);
  }

  calculateParTotal(): number {
    return this.parValues.reduce((sum, p) => sum + p, 0);
  }

  formatRoundDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  calculateAveragesByPar(): void {
    if (!this.selectedUser || !this.selectedUser.rounds || this.selectedUser.rounds.length === 0) {
      this.avgPar3Score = 0;
      this.avgPar4Score = 0;
      this.avgPar5Score = 0;
      return;
    }
    let par3Scores: number[] = [];
    let par4Scores: number[] = [];
    let par5Scores: number[] = [];
    this.selectedUser.rounds.forEach(round => {
      round.roundScores.forEach((score, index) => {
        const par = this.parValues[index];
        if (par === 3) par3Scores.push(score);
        else if (par === 4) par4Scores.push(score);
        else if (par === 5) par5Scores.push(score);
      });
    });
    this.avgPar3Score = par3Scores.length > 0 ? par3Scores.reduce((a, b) => a + b, 0) / par3Scores.length : 0;
    this.avgPar4Score = par4Scores.length > 0 ? par4Scores.reduce((a, b) => a + b, 0) / par4Scores.length : 0;
    this.avgPar5Score = par5Scores.length > 0 ? par5Scores.reduce((a, b) => a + b, 0) / par5Scores.length : 0;
  }
}
