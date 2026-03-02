import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TeeTimeService } from '../../services/tee-time.service';
import { formatDate } from '@angular/common';
import { combineLatest } from 'rxjs';
import { take } from 'rxjs/operators';
import { User } from '../../../objects/user';

@Component({
  selector: 'app-tee-sheet',
  standalone: false,
  templateUrl: './tee-sheet.component.html',
  styleUrl: './tee-sheet.component.css'
})
export class TeeSheetComponent {
  tournamentDate: Date | null = null;
  name = '';
  group = '';
  timeSuggestion = '';
  times: string[] = [];
  teeSheet: { time: string; users: (User  | null)[] }[] = [];
  allUsers: User[] = [];

  constructor(private route: ActivatedRoute,
    private teeTimeService: TeeTimeService,
    private router: Router) {}

  ngOnInit(): void {
    // Retrieve the tournament date from the route
    this.route.params.subscribe(params => {
      const dateStr = params['date'];
      if (dateStr) {
        const dateParts = dateStr.split('-'); // ['2025', '04', '27']
        const year = +dateParts[0];
        const month = +dateParts[1] - 1; // Months are 0-based
        const day = +dateParts[2];
        this.tournamentDate = new Date(year, month, day);
      }
    });
    this.loadData();
  }

  loadData(): void {
    combineLatest([
      this.teeTimeService.getUsers(),
      this.teeTimeService.getTeeTimeSlots()
    ]).pipe(take(1)).subscribe({
      next: ([users, slots]) => {
        this.allUsers = users.map(user => {
          user.paidSkins = user.paidSkins ?? false;
          return user;
        });
        this.times = slots;
        this.loadTeeTimes();
      },
      error: (err) => {
        console.error('Error loading data:', err);
      }
    });
  }

  loadTeeTimes(): void {
    const formattedDate = this.tournamentDate ? formatDate(this.tournamentDate, 'yyyy-MM-dd', 'en-US') : '';
    this.teeTimeService.getTeeTimesByDate(formattedDate).subscribe(
      (data: any[]) => {
        this.buildTeeSheet(data);
      },
      (error) => {
        console.error('Error fetching tee times:', error);
        this.buildTeeSheet([]); // Fallback to empty data
      }
    );
  }

  buildTeeSheet(teeTimes: any[]): void {
    this.teeSheet = this.times.map((time) => {
      const teeTime = teeTimes.find((t) => t.time === time);
      let users: (User  | null)[] = Array(4).fill(null); // Always start with 4 slots

      if (teeTime && teeTime.users) {
        // Populate users; extend array if more than 4 users
        users = teeTime.users.slice(0, 6).map((userName: string) => {
          const matchedUser = this.allUsers.find(u => u.name === userName);
          return matchedUser ?? { name: userName, paidSkins: false }; // fallback if user not found
        });

        // Pad with null if fewer than 4 users
        while (users.length < 4) {
          users.push(null);
        }
      }

      return { time, users };
    });
  }

  submitTeeTime() {
    if (this.isFormValid()) {
    // Call the service method to submit the data
    let dateTimeNow = new Date();
    this.teeTimeService.submitTeeTimeSuggestion(this.name, this.group, this.timeSuggestion, dateTimeNow).subscribe({
      next: (response: any) => {
        alert('Your tee time suggestion has been submitted!');
      },
      error: (error: any) => {
        console.error('Submission failed:', error);
        alert('There was an error submitting your suggestion. Please try again.');
      }
    });

      this.name = '';
      this.group = '';
      this.timeSuggestion = '';
    }
    this.router.navigate(['/home']).catch(err => {
      console.error('Navigation error:', err);
    });
  }

  isFormValid(): boolean {
    return this.name.trim() !== '' && this.group.trim() !== '' && this.timeSuggestion.trim() !== '';
  }
}
