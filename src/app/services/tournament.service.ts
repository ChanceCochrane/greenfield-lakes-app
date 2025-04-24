// tournament.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  getMostRecentTournamentDate(): string {
    const today = new Date();
    // Apply Arizona's -7 hour UTC offset
    today.setHours(today.getHours() - 7);

    // Get tournament dates from environment
    const tournamentDates = environment.tournamentDates
        .map(dateStr => new Date(dateStr))
        .filter(date => !isNaN(date.getTime())); // Filter out invalid dates

    // Find past tournaments
    const pastTournaments = tournamentDates.filter(date => date <= today);

    // Get the most recent one
    const lastTournament = pastTournaments[pastTournaments.length - 1];

    return lastTournament
        ? lastTournament.toISOString().split('T')[0]
        : ''; // Return empty string if no valid dates found
  }
}
