import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  NgZone,
  HostListener,
  inject,
} from '@angular/core';
import * as L from 'leaflet';

const defaultIcon = L.icon({
  iconUrl: '../../../assets/img/marker-green-40.png',
  shadowUrl: '../../../assets/img/marker-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

@Component({
  selector: 'app-dir',
  templateUrl: './dir.component.html',
  styleUrls: ['./dir.component.css'],
})
export class DirComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private ngZone = inject(NgZone);

  map!: L.Map;
  markers: L.Marker[] = [];
  resizeObserver!: ResizeObserver;

  isLoading = true;
  mapError: string | null = null;

  readonly defaultCenter: L.LatLngExpression = [51.505, -0.09];
  readonly defaultZoom = 13;

  ngOnInit(): void {
    this.initMap();
    this.observeResize();
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }

  @HostListener('window:resize')
  onResize() {
    this.invalidateSize();
  }

  public initMap() {
    try {
      this.isLoading = true;
      this.mapError = null;

      this.map = L.map(this.mapContainer.nativeElement, {
        center: this.defaultCenter,
        zoom: this.defaultZoom,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.map);

      L.control.scale({ position: 'bottomleft' }).addTo(this.map);

      this.map.on('click', (e: L.LeafletMouseEvent) =>
        this.addMarker(e.latlng)
      );

      this.map.whenReady(() => {
        this.isLoading = false;
        this.invalidateSize();
      });
    } catch (err) {
      console.error(err);
      this.mapError = 'Map failed to load';
      this.isLoading = false;
    }
  }

  private observeResize() {
    this.resizeObserver = new ResizeObserver(() => this.invalidateSize());
    this.resizeObserver.observe(this.mapContainer.nativeElement);
  }

  private invalidateSize() {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 100);
    }
  }

  addMarker(latLng: L.LatLng) {
    const marker = L.marker(latLng, { draggable: true }).addTo(this.map);
    this.markers.push(marker);
  }

  clearMarkers() {
    this.markers.forEach((m) => this.map.removeLayer(m));
    this.markers = [];
  }
}
