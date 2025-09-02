import { Component, OnInit } from '@angular/core';
declare var google: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'traffic-signals-app';

  constructor() {}

  ngOnInit(): void {
    this.loadGoogleMaps();
  }

  private loadGoogleMaps(): void {
    if (typeof google === 'undefined') {
      const script = document.createElement('script');
      script.src =
        'https://maps.googleapis.com/maps/api/js?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg&callback=onGoogleMapsLoaded&v=weekly&libraries=places';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      // Set callback for when Google Maps is loaded
      (window as any).onGoogleMapsLoaded = () => {
        console.log('Google Maps loaded');
      };
    }
  }
}
