import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { DirComponent } from './components/dir/dir.component';
import { TrafficSignalComponent } from './components/traffic-signal/traffic-signal.component';
import { MapviewComponent } from './components/mapview/mapview.component';

const routes: Routes = [
  { path: '', redirectTo: '/map', pathMatch: 'full' },
  { path: 'map', component: DirComponent },
  { path: 'TrafficSignal', component: TrafficSignalComponent },
  { path: 'mapview', component: MapviewComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes), CommonModule],
  exports: [RouterModule],
})
export class AppRoutingModule {}
