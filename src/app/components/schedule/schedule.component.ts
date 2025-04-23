import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-schedule',
  standalone: false,
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.css'
})
export class ScheduleComponent implements OnInit{
  tournaments: { date: Date, canSignUp: boolean }[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.generateTournamentSchedule();
  }

  // Generate the tournament dates starting from Jan 5, 2025, every other Sunday
  generateTournamentSchedule(): void {
    const today = new Date();

    // Read dates from environment variable
    this.tournaments = environment.tournamentDates.map(dateString => {
      const tournamentDate = new Date(dateString);
      return {
        date: tournamentDate,
        canSignUp: tournamentDate > today
      };
    });
  }

  // Navigate to the sign-up page when the button is clicked
  onSignUp(tournamentDate: Date): void {
    const formattedDate = tournamentDate.toISOString().split('T')[0]; // e.g., "2025-04-21"
    this.router.navigate(['/teesheet', formattedDate]);
  }

  getResults(tournamentDate: Date): void {
    const formattedDate = tournamentDate.toISOString().split('T')[0]; // e.g., "2025-04-21"
    this.router.navigate(['/results', formattedDate]);
  }
}
