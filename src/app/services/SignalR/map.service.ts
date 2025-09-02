import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Location } from 'src/app/model/traffic-signal-interface/location';
declare var google: any;
declare var RouteBoxer: any;

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private map: any;
  private directionService: any;
  private directionRenderer: any;
  private routeBoxer: any;
  private placesService: any;

  private locations: Location[] = [];
  private inLocations: Location[] = [];
  private outLocations: Location[] = [];
  private signMarkers: any[] = [];

  private _from: any = null;
  private _to: any = null;

  public mapInitialized = new BehaviorSubject<boolean>(false);

  constructor() {}

  initMap(mapElement: HTMLElement): void {
    this.map = new google.maps.Map(mapElement, {
      center: { lat: 30.0332459, lng: 31.1679859 },
      zoom: 8,
      mapTypeId: 'terrain',
    });

    this.directionService = new google.maps.DirectionsService();
    this.directionRenderer = new google.maps.DirectionsRenderer({
      map: this.map,
    });
    this.routeBoxer = new RouteBoxer();
    this.placesService = new google.maps.places.PlacesService(this.map);

    this.mapInitialized.next(true);
  }

  getMap(): any {
    return this.map;
  }
}
