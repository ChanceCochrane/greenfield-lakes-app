import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TeeTimeService } from '../../services/tee-time.service';
import { User } from '../../../objects/user';

@Component({
  selector: 'app-information',
  standalone: false,
  templateUrl: './information.component.html',
  styleUrl: './information.component.css'
})
export class InformationComponent {
  users: User[] = []; // List of users you want to display

  targetAmountHoleInOne = environment.holeInOnePot; // Final amount to display

  holeInOneDisplay = 0;    // Value that animates

  constructor(private teeTimeService: TeeTimeService) {} // Inject service

  ngOnInit(): void {
    this.getUsers();
    this.animateCountUp(); // Start the count-up animation
  }

  animateCountUp(): void {
    const duration = 2500; // total animation time in ms
    const frameRate = 40;  // ms between each step
    const totalSteps = duration / frameRate;
    const increment = this.targetAmountHoleInOne / totalSteps;

    const counter = setInterval(() => {
      this.holeInOneDisplay += increment;
      if (this.holeInOneDisplay >= this.targetAmountHoleInOne) {
        this.holeInOneDisplay = this.targetAmountHoleInOne;
        clearInterval(counter);
      }
    }, frameRate);
  }

  getUsers(): void {
    this.teeTimeService.getUsers().subscribe(
      (users: any[]) => { // Adjust type to match your User interface
        this.users = users.map(user => {
          user.handicap = user.handicap ?? 0;
          user.paidSkins = user.paidSkins ?? false;
          user.yearlyPoints = user.yearlyPoints ?? 0;
          return user;
        }).sort((a, b) => b.yearlyPoints - a.yearlyPoints).slice(0, 25); // Sort descending, take top 25
      },
      error => {
        console.error('Error fetching users:', error);
      }
    );
  }
}
