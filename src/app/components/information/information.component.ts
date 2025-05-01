import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-information',
  standalone: false,
  templateUrl: './information.component.html',
  styleUrl: './information.component.css'
})
export class InformationComponent {

  targetAmount = environment.holeInOnePot; // Final amount to display
  displayAmount = 0;    // Value that animates

  ngOnInit(): void {
    this.animateCountUp();
  }

  animateCountUp(): void {
    const duration = 2500; // total animation time in ms
    const frameRate = 40;  // ms between each step
    const totalSteps = duration / frameRate;
    const increment = this.targetAmount / totalSteps;

    const counter = setInterval(() => {
      this.displayAmount += increment;
      if (this.displayAmount >= this.targetAmount) {
        this.displayAmount = this.targetAmount;
        clearInterval(counter);
      }
    }, frameRate);
  }
}
