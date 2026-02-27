import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { shareReplay, tap, switchMap, startWith } from 'rxjs/operators';
import { User } from '../../objects/user';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TeeTimeService {
  private apiUrl = environment.apiUrl; // Your Node API URL

  // Cache invalidation triggers
  private usersRefresh$ = new Subject<void>();
  private slotsRefresh$ = new Subject<void>();
  private potRefresh$ = new Subject<void>();

  // Cached observables
  private usersCache$: Observable<User[]>;
  private slotsCache$: Observable<string[]>;
  private potCache$: Observable<{ amount: number }>;

  constructor(private http: HttpClient) {
    // Users cache — re-fetches when usersRefresh$ emits
    this.usersCache$ = this.usersRefresh$.pipe(
      startWith(undefined),
      switchMap(() => this.http.get<User[]>(`${this.apiUrl}/users`)),
      shareReplay(1)
    );

    // Tee time slots cache
    this.slotsCache$ = this.slotsRefresh$.pipe(
      startWith(undefined),
      switchMap(() => this.http.get<string[]>(`${this.apiUrl}/tee-times/slots`)),
      shareReplay(1)
    );

    // Hole-in-one pot cache
    this.potCache$ = this.potRefresh$.pipe(
      startWith(undefined),
      switchMap(() => this.http.get<{ amount: number }>(`${this.apiUrl}/users/hole-in-one-pot`)),
      shareReplay(1)
    );
  }

  getUsers(): Observable<User[]> {
    return this.usersCache$;
  }

  refreshUsers(): void {
    this.usersRefresh$.next();
  }

  createUser(name: string, handicap: number, currentRound: number[], rounds: number[], paidSkins: boolean, yearlyPoints: number, yearlyEarnings: number): Observable<any> {
    const user = { name, handicap, currentRound, rounds, paidSkins, yearlyPoints, yearlyEarnings };
    return this.http.post(`${this.apiUrl}/user`, user).pipe(
      tap(() => this.refreshUsers())
    );
  }

  updateUser(data: {
    name: string;
    handicap?: number;
    currentRound?: number[];
    rounds?: number[][];
    paidSkins?: boolean;
    yearlyPoints?: number;
    yearlyEarnings?: number;
  }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/user`, data).pipe(
      tap(() => this.refreshUsers())
    );
  }

  updateUserScore(name: string, holeNumber: number, newScore: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/update-round`, {
      name,
      holeNumber,
      newScore
    }).pipe(
      tap(() => this.refreshUsers())
    );
  }

  archiveRounds(date: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/archive-rounds`, { date }).pipe(
      tap(() => this.refreshUsers())
    );
  }

  createTeeTime(teeTimeData: { date: string, time: string, users: string[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}/tee-times`, teeTimeData);
  }

  // Fetch tee times by date (optionally filter by time)
  getTeeTimesByDate(date: string, time?: string): Observable<any> {
    let url = `${this.apiUrl}/tee-times/${date}`;
    if (time) {
      url += `?time=${encodeURIComponent(time)}`;
    }
    return this.http.get(url);
  }

  deleteTeeTimesByDate(date: string): Observable<any> {
    let url = `${this.apiUrl}/tee-times/${date}`;
    return this.http.delete(url);
  }

  // Get users who have tee times on a specific date
  getUsersFromTeeTimesByDate(date: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/tee-times/usersFromTeeTimesByDate?date=${encodeURIComponent(date)}`);
  }

  removeUserFromTeeTime(date: string, name: string): Observable<any> {
    const url = `${this.apiUrl}/tee-times/${date}/user`;
    return this.http.request('delete', url, {
      body: { name }
    });
  }

  submitTeeTimeSuggestion(name: string, group: string, time: string, submissionTime: Date): Observable<any> {
    const submission = { name, group, time, submissionTime };
    return this.http.post(`${this.apiUrl}/submissions`, submission);  // Call the /submissions endpoint
  }

  getAllSubmissions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/submissions`); // Call the GET /submissions endpoint
  }

  deleteAllSubmissions(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/submissions`); // Call the DELETE /submissions endpoint
  }

  createTeeTimeSlots(startTime: string, count: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/tee-times/slots`, { startTime, count }).pipe(
      tap(() => this.slotsRefresh$.next())
    );
  }

  getTeeTimeSlots(): Observable<string[]> {
    return this.slotsCache$;
  }

  setHoleInOnePot(amount: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/hole-in-one-pot`, { amount }).pipe(
      tap(() => this.potRefresh$.next())
    );
  }

  getHoleInOnePot(): Observable<{ amount: number }> {
    return this.potCache$;
  }
}
