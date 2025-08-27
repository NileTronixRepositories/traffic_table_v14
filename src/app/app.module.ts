import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { TrafficSignalComponent } from './components/traffic-signal/traffic-signal.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [AppComponent, TrafficSignalComponent],
  imports: [BrowserModule, AppRoutingModule, FormsModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
