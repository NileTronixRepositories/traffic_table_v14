import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DirComponent } from './components/dir/dir.component';
import { TrafficSignalComponent } from './components/traffic-signal/traffic-signal.component';
import { MapviewComponent } from './components/mapview/mapview.component';
import { TrafficPointConfigComponent } from './components/traffic-point-config/traffic-point-config.component';
import { TemplateComponent } from './components/template/template.component';

const routes: Routes = [
  { path: '', redirectTo: 'map', pathMatch: 'full' },
  { path: 'map', component: DirComponent },
  { path: 'traffic-signal', component: TrafficSignalComponent },
  { path: 'mapview', component: MapviewComponent },
  { path: 'traffic-point-config', component: TrafficPointConfigComponent },
  { path: 'template', component: TemplateComponent },
  { path: '**', redirectTo: 'map' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
