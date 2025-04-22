import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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
    const startDate = new Date('2025-01-05');
    const today = new Date();
    let tournamentDate = startDate;

    for (let i = 0; i < 26; i++) {  // Generating 26 Sundays (one for each bi-weekly event)
      const canSignUp = tournamentDate > today;  // Check if the date is in the future

      this.tournaments.push({
        date: new Date(tournamentDate),
        canSignUp
      });

      // Increment by 14 days (every other Sunday)
      tournamentDate.setDate(tournamentDate.getDate() + 14);
    }
  }

  // Navigate to the sign-up page when the button is clicked
  onSignUp(tournamentDate: Date): void {
    const formattedDate = tournamentDate.toISOString().split('T')[0]; // e.g., "2025-04-21"
    console.log('Navigating to:', formattedDate);
    this.router.navigate(['/teesheet', formattedDate]);
  }

  getResults(tournamentDate: Date): void {
    const formattedDate = tournamentDate.toISOString().split('T')[0]; // e.g., "2025-04-21"
    console.log('Navigating to:', formattedDate);
    this.router.navigate(['/results', formattedDate]);
  }
}
