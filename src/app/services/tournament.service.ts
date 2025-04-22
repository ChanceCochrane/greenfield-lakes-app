// tournament.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  getMostRecentTournamentDate(): string {
    const startDate = new Date('2025-01-05');
    const today = new Date();
    const pastTournaments: Date[] = [];

    for (let i = 0; i < 26; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + (i * 14));

      if (date <= today) {
        pastTournaments.push(date);
      }
    }

    // Get the most recent one
    const lastTournament = pastTournaments[pastTournaments.length - 1];
    return lastTournament.toISOString().split('T')[0];
  }
}
