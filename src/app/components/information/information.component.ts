import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-information',
  standalone: false,
  templateUrl: './information.component.html',
  styleUrl: './information.component.css'
})
export class InformationComponent {

  targetAmountHoleInOne = environment.holeInOnePot; // Final amount to display
  targetAmountEndOfYearPot = environment.endOfYearPot; // Final amount to display

  holeInOneDisplay = 0;    // Value that animates
  endOfYearPot = 0;

  ngOnInit(): void {
    this.animateCountUp();
  }

  animateCountUp(): void {
    const duration = 2500; // total animation time in ms
    const frameRate = 40;  // ms between each step
    const totalSteps = duration / frameRate;
    const increment = this.targetAmountHoleInOne / totalSteps;
    const incrementEoY = this.targetAmountEndOfYearPot / totalSteps;

    const counter = setInterval(() => {
      this.holeInOneDisplay += increment;
      if (this.holeInOneDisplay >= this.targetAmountHoleInOne) {
        this.holeInOneDisplay = this.targetAmountHoleInOne;
        clearInterval(counter);
      }
    }, frameRate);

    const counterEoY = setInterval(() => {
      this.endOfYearPot += incrementEoY;
      if (this.endOfYearPot >= this.targetAmountEndOfYearPot) {
        this.endOfYearPot = this.targetAmountEndOfYearPot;
        clearInterval(counterEoY);
      }
    }, frameRate);
  }
}
