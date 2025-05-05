import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../objects/user';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TeeTimeService {
  private apiUrl = environment.apiUrl; // Your Node API URL

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  createUser(name: string, handicap: number, currentRound: number[], rounds: number[]): Observable<any> {
    const user = { name, handicap, currentRound, rounds };
    return this.http.post(`${this.apiUrl}/user`, user);
  }

  updateUser(data: {
    name: string;
    handicap?: number;
    currentRound?: number[];
    rounds?: number[][];
  }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/user`, data);
  }

  updateUserScore(name: string, holeNumber: number, newScore: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/update-round`, {
      name,
      holeNumber,
      newScore
    });
  }

  archiveRounds(date: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/archive-rounds`, { date });
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
}
