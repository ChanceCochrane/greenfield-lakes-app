import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TeeTimeService } from '../../services/tee-time.service';
import { User } from '../../../objects/user';

@Component({
  selector: 'app-admin',
  standalone: false,
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  selectedDate: Date = new Date(); // Default to today's date
  selectedDateString: string = '';
  users: User[] = []; // List of users you want to display
  teeTimes: string[] = [];
  selectedTeeTimes: { [user: string]: string } = {}; // To store selected tee time for each user
  user = {
    name: '',
    handicap: null
  };
  submissionMessage: string | null = null;
  // Static list of available times for the dropdown
  times: string[] = environment.sundayTeeTimes;
  initializeRound = [3, 4, 5, 3, 3, 3, 3, 3, 5, 4, 3, 3, 3, 3, 4, 3, 3, 4];

  accessCode = '';
  authorized = false;
  errorMessage = '';

  submissions: { [key: string]: { name: string; group: string; time: string; submissionTime: Date } } | null = null; // Store the submissions data
  message: string = ''; // Store success/error messages

  constructor(private teeTimeService: TeeTimeService) {  }

  ngOnInit(): void {
    // Set to next Sunday
    this.generateTeeTimes();

    this.selectedDate = this.getNextSundayDate();
    this.selectedDateString = this.formatDate(this.selectedDate);

    this.getUsers();

    this.fetchSubmissions();
  }

  getUsers(): void {
    this.teeTimeService.getUsers().subscribe(
      (users: User[]) => {
        this.users = users;
        this.fetchTeeTimes();
      },
      error => {
        console.error('Error fetching users:', error);
      }
    );
  }

  fetchTeeTimes(): void {
    this.teeTimeService.getTeeTimesByDate(this.selectedDateString).subscribe({
      next: (response) => {
        // Initialize user selections
        this.users.forEach(user => {
          const assignedTeeTime = response.find((teeTime: any) => teeTime.users?.includes(user.name));
          this.selectedTeeTimes[user.name] = assignedTeeTime ? assignedTeeTime.time : 'N/A';
        });
      },
      error: () => {
        this.users.forEach(user => {
          this.selectedTeeTimes[user.name] = 'N/A';
        });
      }
    });
  }

  // Fetch all submissions
  fetchSubmissions(): void {
    this.teeTimeService.getAllSubmissions().subscribe({
      next: (response) => {
        this.submissions = response.data; // Store the submissions data
        this.message = response.message; // Display the message
      },
      error: (error) => {
        this.message = 'Error fetching submissions: ' + error.message;
      },
    });
  }

  deleteSubmissions(): void {
    this.teeTimeService.deleteAllSubmissions().subscribe({
      next: (response) => {
        this.submissions = null; // Clear the submissions
        this.message = response.message; // Display the success message
      },
      error: (error) => {
        this.message = 'Error deleting submissions: ' + error.message;
      },
    });
  }

  getNextSundayDate(): Date {
    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7;
    today.setDate(today.getDate() + daysUntilSunday); // Set to next Sunday
    return today;
  }

  generateTeeTimes() {
    const times = environment.sundayTeeTimes;
    this.teeTimes = times; // Set the generated times to the teeTimes array
  }

  // Update onDateChange to accept typed event
  onDateChange(dateString: string) {
    this.selectedDateString = dateString;
    this.selectedDate = new Date(dateString);
    this.generateTeeTimes();
    this.fetchTeeTimes();
  }

  updateTeeTime(user: string, teeTime: string) {
    this.teeTimeService.removeUserFromTeeTime(this.selectedDate.toISOString().split('T')[0], user).subscribe({
      next: res => console.log('Success:', res),
      error: err => console.error('Error:', err)
    });
    if(teeTime !== 'N/A') {
      const teeTimeData = {
        date: this.selectedDate.toISOString().split('T')[0], // Format date as YYYY-MM-DD
        time: teeTime,
        users: [user]
      };
      this.teeTimeService.createTeeTime(teeTimeData).subscribe({
        next: (response) => {
          console.log('Tee Time Created:', response);
        },
        error: (error) => {
          console.error('Error creating tee time:', error);
        }
      });
    }
  }

  onSubmit() {
    if (this.user.name && this.user.handicap !== null) {
      // Call the createUser method from the service
      this.teeTimeService.createUser(this.user.name, this.user.handicap, [], [])
        .subscribe(
          (response) => {
            this.submissionMessage = 'User created successfully!';
            // Optionally, reset the form after successful submission
            this.user = { name: '', handicap: null };
          },
          (error) => {
            this.submissionMessage = 'Error creating user. Please try again.';
            console.error('Error:', error);
          }
        );
    }
  }

  archiveRounds(): void {
    const today = new Date().toISOString().split("T")[0];

    const confirmed = confirm(`Are you sure you want to archive current rounds for ${today}?`);
    if (!confirmed) return;

    this.teeTimeService.archiveRounds(today).subscribe({
      next: (res) => {
        alert("Rounds archived successfully!");
      },
      error: (err) => {
        alert("Error archiving rounds.");
        console.error(err);
      }
    });
  }

  checkAccess() {
    if (this.accessCode.trim().toUpperCase() === 'GFMC') {
      this.authorized = true;
      this.errorMessage = '';
    } else {
      this.errorMessage = 'Invalid code. Try again.';
    }
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // JS months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
