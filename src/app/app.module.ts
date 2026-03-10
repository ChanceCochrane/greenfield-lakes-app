import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { InformationComponent } from './components/information/information.component';
import { ScheduleComponent } from './components/schedule/schedule.component';
import { LeaderboardComponent } from './components/leaderboard/leaderboard.component';
import { HttpClientModule } from '@angular/common/http';
import { LeaderboardService } from './services/leaderboard.service';
import { TeeTimeService } from './services/tee-time.service';
import { TournamentService } from './services/tournament.service';
import { ResultsComponent } from './components/results/results.component';
import { TeeSheetComponent } from './components/tee-sheet/tee-sheet.component';
import { FormsModule } from '@angular/forms';
import { LiveLeaderboardComponent } from './components/live-leaderboard/live-leaderboard.component';
import { AdminComponent } from './components/admin/admin.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    InformationComponent,
    ScheduleComponent,
    LeaderboardComponent,
    ResultsComponent,
    TeeSheetComponent,
    LiveLeaderboardComponent,
    AdminComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [LeaderboardService,
    TeeTimeService,
    TournamentService],
  bootstrap: [AppComponent]
})
export class AppModule { }
