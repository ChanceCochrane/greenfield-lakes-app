import { Component, OnInit } from '@angular/core';
import { TeeTimeService } from '../../services/tee-time.service';


@Component({
  selector: 'app-information',
  standalone: false,
  templateUrl: './information.component.html',
  styleUrl: './information.component.css'
})
export class InformationComponent implements OnInit {
  // Hole-in-one pot
  holeInOnePotAmount: number = 0;

  constructor(private teeTimeService: TeeTimeService) {}

  ngOnInit(): void {
    this.fetchHoleInOnePot();
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
}
