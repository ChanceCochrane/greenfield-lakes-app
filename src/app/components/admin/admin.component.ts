import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TeeTimeService } from '../../services/tee-time.service';
import { User } from '../../../objects/user';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin',
  standalone: false,
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  private apiUrl = environment.apiUrl; // Your Node API URL
  selectedDate: Date = new Date(); // Default to today's date
  selectedDateString: string = '';
  users: User[] = []; // List of users you want to display
  allUsers: User[] = []; // Full list for filtering
  teeTimes: string[] = [];
  selectedTeeTimes: { [user: string]: string } = {}; // To store selected tee time for each user
  user = {
    name: '',
    handicap: null
  };
  submissionMessage: string | null = null;
  // Static list of available times for the dropdown
  times: string[] = [];

  // Search filter properties
  searchTerm: string = '';
  filteredUsers: User[] = [];
  selectedUser: User | null = null;

  // Tee time slot generation
  slotStartTime: string = '7:00';
  slotCount: number = 9;
  slotsMessage: string = '';

  // Hole-in-one pot
  holeInOnePotAmount: number = 0;
  holeInOnePotMessage: string = '';

  accessCode = '';
  authorized = false;
  errorMessage = '';

  submissions: { [key: string]: { name: string; group: string; time: string; submissionTime: Date } } | null = null; // Store the submissions data
  message: string = ''; // Store success/error messages

  constructor(private teeTimeService: TeeTimeService, private http: HttpClient) {  }

  ngOnInit(): void {
    // Set to next Sunday
    this.generateTeeTimes();

    this.selectedDate = this.getNextSundayDate();
    this.selectedDateString = this.formatDate(this.selectedDate);

    this.getUsers();

    this.fetchSubmissions();

    this.fetchTeeTimeSlots();
    this.fetchHoleInOnePot();
  }

  getUsers(): void {
    this.teeTimeService.getUsers().subscribe(
      (users: User[]) => {
        this.allUsers = users.map(user => {
          // Ensure that 0 is used when the handicap is null or undefined
          user.handicap = user.handicap ?? 0;
          user.paidSkins = user.paidSkins ?? false;
          user.yearlyPoints = user.yearlyPoints ?? 0;
          user.yearlyEarnings = user.yearlyEarnings ?? 0;
          return user;
        });
        this.users = [...this.allUsers];
        this.fetchTeeTimes();
      },
      error => {
        console.error('Error fetching users:', error);
      }
    );
  }

  // Getter for displayed users - shows filtered user or all users
  get displayedUsers(): User[] {
    if (this.selectedUser) {
      return [this.selectedUser];
    }
    return this.users;
  }

  onSearchChange(): void {
    if (this.searchTerm.trim() === '') {
      this.filteredUsers = [];
      this.selectedUser = null;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.allUsers.filter(user =>
      user.name.toLowerCase().includes(term)
    );
  }

  selectUser(user: User): void {
    this.selectedUser = user;
    this.searchTerm = user.name;
    this.filteredUsers = [];
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredUsers = [];
    this.selectedUser = null;
  }

  generateTeeTimeSlots(): void {
    this.teeTimeService.createTeeTimeSlots(this.slotStartTime, this.slotCount).subscribe({
      next: (response) => {
        this.slotsMessage = response.message;
        this.teeTimes = response.slots;
      },
      error: (err) => {
        this.slotsMessage = 'Error generating tee time slots.';
        console.error(err);
      }
    });
  }

  fetchTeeTimeSlots(): void {
    this.teeTimeService.getTeeTimeSlots().subscribe({
      next: (slots) => {
        this.teeTimes = slots;
      },
      error: (err) => {
        console.error('Error fetching tee time slots:', err);
      }
    });
  }

  fetchHoleInOnePot(): void {
    this.teeTimeService.getHoleInOnePot().subscribe({
      next: (response) => {
        this.holeInOnePotAmount = response.amount;
      },
      error: (err) => {
        console.error('Error fetching hole-in-one pot:', err);
      }
    });
  }

  updateHoleInOnePot(): void {
    this.teeTimeService.setHoleInOnePot(this.holeInOnePotAmount).subscribe({
      next: (response) => {
        this.holeInOnePotMessage = response.message;
      },
      error: (err) => {
        this.holeInOnePotMessage = 'Error updating hole-in-one pot.';
        console.error(err);
      }
    });
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

  onHandicapChange(user: User, newHandicap: number): void {
    const parsed = Number(newHandicap);
    if (isNaN(parsed) || parsed < -10 || parsed > 30) {
      console.warn(`Invalid handicap value for ${user.name}: ${newHandicap}`);
      return;
    }

    // Only update if the value actually changed
    if (user.handicap !== parsed) {
      user.handicap = parsed;

      this.teeTimeService.updateUser({
        name: user.name,
        handicap: parsed,
      }).subscribe(
        (err) => console.error(`Error updating handicap for ${user.name}:`, err)
      );
    }
  }

  onYearlyPointsChange(user: User, newPoints: any): void {
    // Log the raw input to debug
    console.log(`Raw newPoints for ${user.name}:`, newPoints, typeof newPoints);

    // Convert to number and ensure it's an integer
    const parsed = parseInt(newPoints, 10); // Use parseInt for safer conversion
    console.log(`Parsed newPoints for ${user.name}:`, parsed, typeof parsed);

    // Validate the parsed value
    if (isNaN(parsed) || parsed <= 0 || parsed > 10000) {
      console.warn(`Invalid point value for ${user.name}: ${newPoints} (parsed: ${parsed})`);
      return;
    }

    // Only update if the value actually changed
    if (user.yearlyPoints !== parsed) {
      user.yearlyPoints = parsed;
      console.log(`Updating yearlyPoints for ${user.name} to:`, parsed);

      this.teeTimeService.updateUser({
        name: user.name,
        yearlyPoints: parsed, // Ensure we're sending a number
      }).subscribe(
        () => console.log(`Yearly points updated for ${user.name} to ${parsed}`),
        (err) => console.error(`Error updating yearlyPoints for ${user.name}:`, err)
      );
    }
  }

  onYearlyEarningsChange(user: User, newEarnings: any): void {
    // Convert to number and ensure it's a valid decimal
    const parsed = parseFloat(newEarnings);

    // Validate the parsed value
    if (isNaN(parsed) || parsed < 0 || parsed > 100000) {
      console.warn(`Invalid earnings value for ${user.name}: ${newEarnings} (parsed: ${parsed})`);
      return;
    }

    // Round to 2 decimal places for currency
    const rounded = Math.round(parsed * 100) / 100;

    // Only update if the value actually changed
    if (user.yearlyEarnings !== rounded) {
      user.yearlyEarnings = rounded;
      console.log(`Updating yearlyEarnings for ${user.name} to:`, rounded);

      this.teeTimeService.updateUser({
        name: user.name,
        yearlyEarnings: rounded,
      }).subscribe(
        () => console.log(`Yearly earnings updated for ${user.name} to ${rounded}`),
        (err) => console.error(`Error updating yearlyEarnings for ${user.name}:`, err)
      );
    }
  }

  getNextSundayDate(): Date {
    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7;
    today.setDate(today.getDate() + daysUntilSunday); // Set to next Sunday
    return today;
  }

  generateTeeTimes() {
    this.fetchTeeTimeSlots();
  }

  // Update onDateChange to accept typed event
  onDateChange(dateString: string) {
    this.selectedDateString = dateString;
    this.selectedDate = new Date(dateString);
    this.generateTeeTimes();
    this.fetchTeeTimes();
  }

  updateTeeTime(user: string, teeTime: string) {
    this.teeTimeService.removeUserFromTeeTime(this.selectedDateString, user).subscribe({
      next: res => console.log('Success:', res),
      error: err => console.error('Error:', err)
    });
    if(teeTime !== 'N/A') {
      const teeTimeData = {
        date: this.selectedDateString, // Format date as YYYY-MM-DD
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
    } else {
      this.teeTimeService.updateUser({
        name: user,
        currentRound: []
      }).subscribe({
        next: () => console.log(`Current round cleared for ${user}`),
        error: (err) => console.error(`Error clearing current round for ${user}:`, err)
      });
    }
  }

  onSubmit() {
    if (this.user.name && this.user.handicap !== null) {
      // Call the createUser method from the service
      this.teeTimeService.createUser(this.user.name, this.user.handicap, [], [], false, 0, 0)
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
    this.teeTimeService.deleteTeeTimesByDate(today).subscribe({
      error: (err) => {
        alert("Error deleting tee times.");
        console.error(err);
      }
    });
  }

  checkAccess() {
    const authUrl = `${this.apiUrl}/verifyAdminAccess`;
    this.http.post<{ authorized: boolean, error?: string }>(authUrl, { accessCode: this.accessCode })
      .subscribe({
        next: (response) => {
          if (response.authorized) {
            this.authorized = true;
            this.errorMessage = '';
          } else {
            this.errorMessage = response.error || 'Invalid code. Try again.';
          }
        },
        error: (err) => {
          this.errorMessage = 'Error verifying access. Please try again later.';
          console.error('API error:', err);
        }
      });
  }

  trackByUserName(_index: number, user: User): string {
    return user.name;
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // JS months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onCheckboxChange(user: User, isChecked: boolean): void {
    user.paidSkins = isChecked;
    this.teeTimeService.updateUser({
      name: user.name,
      paidSkins: user.paidSkins
    }).subscribe({
      error: (err) => {
        alert("Error updating paid skins status.");
        console.error(err);
      }
    });

  }
}
