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
        .map(tournament => new Date(tournament.date))
        .filter(date => !isNaN(date.getTime())); // Filter out invalid dates

    // Find past tournaments
    const pastTournaments = tournamentDates.filter(date => date <= today);

    // Get the most recent one
    const lastTournament = pastTournaments[pastTournaments.length - 1];

    return lastTournament
        ? lastTournament.toISOString().split('T')[0]
        : ''; // Return empty string if no valid dates found
  }

  getNextTournamentDate(): string {
    const today = new Date();
    // Apply Arizona's -7 hour UTC offset
    today.setHours(today.getHours() - 7);

    // Get tournament dates from environment
    const tournamentDates = environment.tournamentDates
        .map(tournament => new Date(tournament.date))
        .filter(date => !isNaN(date.getTime())); // Filter out invalid dates

    // Find past tournaments
    const futureTournaments = tournamentDates.filter(date => date >= today);

    // Get the newest one
    const nextTournament = futureTournaments[0];

    return nextTournament
        ? nextTournament.toISOString().split('T')[0]
        : ''; // Return empty string if no valid dates found
  }
}
