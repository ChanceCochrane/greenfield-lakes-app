import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveLeaderboardComponent } from './live-leaderboard.component';

describe('LiveLeaderboardComponent', () => {
  let component: LiveLeaderboardComponent;
  let fixture: ComponentFixture<LiveLeaderboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LiveLeaderboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveLeaderboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
