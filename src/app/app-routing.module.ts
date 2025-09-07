import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { DirComponent } from './components/dir/dir.component';
import { TrafficSignalComponent } from './components/traffic-signal/traffic-signal.component';
import { MapviewComponent } from './components/mapview/mapview.component';
import { TrafficPointConfigComponent } from './components/traffic-point-config/traffic-point-config.component';

const routes: Routes = [
  { path: '', redirectTo: '/map', pathMatch: 'full' },
  { path: 'map', component: DirComponent },
  { path: 'TrafficSignal', component: TrafficSignalComponent },
  { path: 'mapview', component: MapviewComponent },
  { path: 'TrafficPointConfic', component: TrafficPointConfigComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes), CommonModule],
  exports: [RouterModule],
})
export class AppRoutingModule {}
