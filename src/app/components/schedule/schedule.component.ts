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

  generateTournamentSchedule(): void {
    const today = new Date();

    this.tournaments = environment.tournamentDates.map(dateString => {
      // Split the date string (e.g., '2025-04-13') into components
      const [year, month, day] = dateString.split('-').map(Number);

      // Create a Date object with local date components (month is 0-based in JS)
      const tournamentDate = new Date(year, month - 1, day);

      return {
        date: tournamentDate,
        canSignUp: tournamentDate > today
      };
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
