import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User } from '../../../objects/user';
import { LeaderboardService } from '../../services/leaderboard.service';

@Component({
  selector: 'app-schedule',
  standalone: false,
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.css'
})
export class ScheduleComponent implements OnInit{
  tournaments: { date: Date, canSignUp: boolean }[] = [];
  leaderboardToday: { name: string; } [] = [];

  constructor(private router: Router, private leaderboardService: LeaderboardService) {}

  ngOnInit(): void {
    const today = new Date();
    this.generateTournamentSchedule(today);
  }

  async generateTournamentSchedule(today: Date): Promise<void> {
    await this.getScoresForToday(today);

    this.tournaments = environment.tournamentDates.map(dateString => {
      // Split the date string (e.g., '2025-04-13') into components
      const [year, month, day] = dateString.split('-').map(Number);

      // Create a Date object with local date components (month is 0-based in JS)
      const tournamentDate = new Date(year, month - 1, day);

      const tournamentDateOnly = new Date(tournamentDate.getFullYear(), tournamentDate.getMonth(), tournamentDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const isSameDate =
       tournamentDateOnly.getFullYear() === todayOnly.getFullYear() &&
       tournamentDateOnly.getMonth() === todayOnly.getMonth() &&
       tournamentDateOnly.getDate() === todayOnly.getDate();

       return {
        date: tournamentDate,
        canSignUp: isSameDate ? this.leaderboardToday.length === 0 : tournamentDateOnly >= todayOnly
      };
    });
  }

  getScoresForToday(today: Date): Promise<void> {
    return new Promise((resolve) => {
      this.leaderboardService.getGrossLeaderboardForDate(today.toISOString().split('T')[0]).subscribe((users: User[]) => {
        this.leaderboardToday = users.slice(0, 5).map(user => ({
          name: user.name,
        }));
        resolve();
      });
    });
  }

  // Navigate to the tee page when the button is clicked
  onSignUp(tournamentDate: Date): void {
    const normalizedDate = new Date(tournamentDate.getFullYear(), tournamentDate.getMonth(), tournamentDate.getDate());
    const formattedDate = normalizedDate.toISOString().split('T')[0];
    this.router.navigate(['/teesheet', formattedDate]);
  }

  getResults(tournamentDate: Date): void {
    const normalizedDate = new Date(tournamentDate.getFullYear(), tournamentDate.getMonth(), tournamentDate.getDate());
    const formattedDate = normalizedDate.toISOString().split('T')[0];
    this.router.navigate(['/results', formattedDate]);
  }
}
