import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { TrafficSignalComponent } from './components/traffic-signal/traffic-signal.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DirComponent } from './components/dir/dir.component';
import { MapviewComponent } from './components/mapview/mapview.component';
import { PointconfigComponent } from './components/pointconfig/pointconfig.component';
import { TemplateComponent } from './components/template/template.component';
import { HeaderComponent } from './components/header/header.component';
import { TrafficPointConfigComponent } from './components/traffic-point-config/traffic-point-config.component';

@NgModule({
  declarations: [
    AppComponent,
    TrafficSignalComponent,
    DirComponent,
    MapviewComponent,
    PointconfigComponent,
    TemplateComponent,
    HeaderComponent,
    TrafficPointConfigComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
