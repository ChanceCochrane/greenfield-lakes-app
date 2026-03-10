import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { InformationComponent } from './components/information/information.component';
import { ScheduleComponent } from './components/schedule/schedule.component';
import { LeaderboardComponent } from './components/leaderboard/leaderboard.component';
import { ResultsComponent } from './components/results/results.component';
import { TeeSheetComponent } from './components/tee-sheet/tee-sheet.component';
import { AdminComponent } from './components/admin/admin.component';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'information', component: InformationComponent },
  { path: 'schedule', component: ScheduleComponent },
  { path: 'leaderboard', component: LeaderboardComponent },
  { path: 'results/:date', component: ResultsComponent },
  { path: 'teesheet/:date', component: TeeSheetComponent },
  { path: 'admin', component: AdminComponent},
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
