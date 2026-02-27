import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TeeTimeService } from '../../services/tee-time.service';
import { User, Round } from '../../../objects/user';


@Component({
  selector: 'app-information',
  standalone: false,
  templateUrl: './information.component.html',
  styleUrl: './information.component.css'
})
export class InformationComponent implements OnInit {
  users: User[] = []; // List of users you want to display
  allUsers: User[] = []; // Full list for search
  searchTerm: string = '';
  filteredUsers: User[] = [];
  selectedUser: User | null = null;
  parValues: number[] = environment.parValues;

  // Average scores by par
  avgPar3Score: number = 0;
  avgPar4Score: number = 0;
  avgPar5Score: number = 0;

  // Hole-in-one pot
  holeInOnePotAmount: number = 0;

  constructor(private teeTimeService: TeeTimeService) {} // Inject service

  ngOnInit(): void {
    this.getUsers();
    this.fetchHoleInOnePot();
  }

  fetchHoleInOnePot(): void {
    this.teeTimeService.getHoleInOnePot().subscribe({
      next: (response) => {
        this.holeInOnePotAmount = response.amount;
      },
      error: (err) => {
        console.error('Error fetching hole-in-one pot:', err);
      }
    });
  }

  getUsers(): void {
    this.teeTimeService.getUsers().subscribe(
      (users: any[]) => { // Adjust type to match your User interface
        this.allUsers = users.map(user => {
          user.handicap = user.handicap ?? 0;
          user.paidSkins = user.paidSkins ?? false;
          user.yearlyPoints = user.yearlyPoints ?? 0;
          user.yearlyEarnings = user.yearlyEarnings ?? 0;
          return user;
        });
        this.users = [...this.allUsers]
          .sort((a, b) => (b.yearlyPoints ?? 0) - (a.yearlyPoints ?? 0))
          .slice(0, 25); // Sort descending, take top 25
      },
      error => {
        console.error('Error fetching users:', error);
      }
    );
  }

  onSearchChange(): void {
    if (this.searchTerm.trim() === '') {
      this.filteredUsers = [];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.allUsers.filter(user =>
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
    if (score <= par - 1) {
      return 'birdie-circle'; // Birdie or better
    } else if (score >= par + 1) {
      return 'bogey-square'; // Bogey or worse
    }
    return ''; // Par - no decoration
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
        if (par === 3) {
          par3Scores.push(score);
        } else if (par === 4) {
          par4Scores.push(score);
        } else if (par === 5) {
          par5Scores.push(score);
        }
      });
    });

    this.avgPar3Score = par3Scores.length > 0
      ? par3Scores.reduce((a, b) => a + b, 0) / par3Scores.length
      : 0;
    this.avgPar4Score = par4Scores.length > 0
      ? par4Scores.reduce((a, b) => a + b, 0) / par4Scores.length
      : 0;
    this.avgPar5Score = par5Scores.length > 0
      ? par5Scores.reduce((a, b) => a + b, 0) / par5Scores.length
      : 0;
  }
}
