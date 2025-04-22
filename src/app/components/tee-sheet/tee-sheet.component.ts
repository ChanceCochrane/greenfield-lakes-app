import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TeeTimeService } from '../../services/tee-time.service';
import { formatDate } from '@angular/common';
import { environment } from '../../../environments/environment';

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
  times: string[] = environment.sundayTeeTimes;
  teeSheet: { time: string; users: (string | null)[] }[] = [];

  constructor(private route: ActivatedRoute,
    private teeTimeService: TeeTimeService,
    private router: Router) {}

  ngOnInit(): void {
    // Retrieve the tournament date from the route
    this.route.params.subscribe(params => {
      const dateStr = params['date'];
      if (dateStr) {
        this.tournamentDate = new Date(dateStr);
      }
    });
    this.loadTeeTimes();
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
      let users: (string | null)[] = Array(4).fill(null); // Always start with 4 slots

      if (teeTime && teeTime.users) {
        // Populate users; extend array if more than 4 users
        users = teeTime.users.slice(0, 6).map((user: string) => user || null);
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
