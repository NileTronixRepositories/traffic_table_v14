import { AfterViewInit, Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import * as L from 'leaflet';
import { MapviewService } from 'src/app/services/mapview.service';
import { Template } from 'src/app/model/template';
import { Area } from 'src/app/model/area';
import { GovernorateDto } from 'src/app/model/governorate';
import { Location } from 'src/app/model/traffic-signal-interface/location';

@Component({
  selector: 'app-mapview',
  templateUrl: './mapview.component.html',
  styleUrls: ['./mapview.component.css'],
})
export class MapviewComponent implements OnInit, AfterViewInit {
  trafficForm!: FormGroup;
  form!: FormGroup;

  governorates: GovernorateDto[] = [];
  areas: Area[] = [];
  templates: Template[] = [];
  locations: Location[] = [];
  lightPatterns: any[] = [];
  templatePatterns: any[] = [];

  private map!: L.Map;
  private markers: L.Marker[] = [];
  selectedMarker: L.Marker | null = null;
  selectedLocation: Location | null = null;

  private selectedIcon = L.icon({
    iconUrl: '../../../assets/img/traffic-light-selected.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -30],
  });

  // Custom traffic icon
  private trafficIcon = L.icon({
    iconUrl: '../../../assets/img/traffic-light-305721.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  });

  constructor(
    private fb: FormBuilder,
    private mapviewService: MapviewService
  ) {}

  ngOnInit(): void {
    this.mapviewService.getGovernorates().subscribe({
      next: (data) => {
        console.log('Governorates:', data);
        this.governorates = data || [];
        console.log(this.governorates);
      },
      error: (err) => console.error('Error loading governorates:', err),
    });
    // Preload areas for governorate ID 0 (if applicable)
    this.getGovernorateName(0);
    this.getAreaName(0);
    this.initForm();
    this.loadServerData();
    this.loadGovernorates();

    this.form = this.fb.group({
      template: [0],
      greenTime: [0, [Validators.min(0), Validators.max(1000)]],
      amberTime: [0, [Validators.min(0), Validators.max(1000)]],
      redTime: [
        { value: 0, disabled: true },
        [Validators.min(0), Validators.max(1000)],
      ],
    });

    this.form
      .get('greenTime')
      ?.valueChanges.subscribe(() => this.calculateRedTime());
    this.form
      .get('amberTime')
      ?.valueChanges.subscribe(() => this.calculateRedTime());
  }

  calculateRedTime(): void {
    const green = this.form.get('greenTime')?.value || 0;
    const amber = this.form.get('amberTime')?.value || 0;

    const totalCycle = 40;

    const red = totalCycle - (green + amber);
    this.form
      .get('redTime')
      ?.setValue(red >= 0 ? red : 0, { emitEvent: false });
  }

  // When governorate changes, load areas
  onGovernorateChange(event: any): void {
    const govId = +event.target.value;
    if (!govId) {
      this.areas = [];
      this.form.get('area')?.reset();
      return;
    }

    this.mapviewService.getAreas(govId).subscribe({
      next: (data) => {
        console.log('Areas for governorate', govId, ':', data);
        this.areas = data || [];
      },
      error: (err) => console.error('Error loading areas:', err),
    });
  }

  // On form submit
  onSubmit(): void {
    if (this.trafficForm.valid) {
      this.mapviewService.setLocation(this.trafficForm.value).subscribe({
        next: () => console.log('Data saved successfully!'),
        error: (err) => console.error('Error saving data:', err),
      });
    } else {
      this.trafficForm.markAllAsTouched();
    }
  }
  ngAfterViewInit(): void {
    this.initMap();
  }

  // Form field validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.trafficForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  // Custom validators
  private latitudeValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const numValue = Number(value);
    return isNaN(numValue) || numValue < -90 || numValue > 90
      ? { invalidLatitude: true }
      : null;
  }

  private longitudeValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const numValue = Number(value);
    return isNaN(numValue) || numValue < -180 || numValue > 180
      ? { invalidLongitude: true }
      : null;
  }

  private ipValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    // Simple IP validation regex
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(value) ? null : { invalidIp: true };
  }

  private initForm(): void {
    this.trafficForm = this.fb.group({
      governorate: ['', Validators.required],
      area: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]],
      latitude: ['', [Validators.required, this.latitudeValidator.bind(this)]],
      longitude: [
        '',
        [Validators.required, this.longitudeValidator.bind(this)],
      ],
      ipAddress: ['', [Validators.required, this.ipValidator.bind(this)]],
      template: ['0'],
      greenTime: [30, [Validators.min(0), Validators.max(1000)]],
      amberTime: [10, [Validators.min(0), Validators.max(1000)]],
      redTime: [30, [Validators.min(0), Validators.max(1000)]],
    });

    this.trafficForm.get('governorate')?.valueChanges.subscribe((value) => {
      this.loadAreas(value);
    });

    this.trafficForm.get('template')?.valueChanges.subscribe((value) => {
      this.handleTemplateChange(value);
    });
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [30.0332459, 31.1679859],
      zoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    // Map click event
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat.toFixed(6);
      const lng = e.latlng.lng.toFixed(6);

      // Add temporary marker
      const marker = L.marker([+lat, +lng], { icon: this.trafficIcon })
        .addTo(this.map)
        .bindPopup('New Traffic Sign [0.0.0.0]')
        .openPopup();

      this.markers.push(marker);

      // Update form with new location data
      this.clearForm();
      this.trafficForm.patchValue({
        name: `Traffic Sign ${lat}, ${lng}`,
        latitude: lat,
        longitude: lng,
        ipAddress: '0.0.0.0',
      });

      this.selectedMarker = marker;
      this.selectedLocation = null;
    });
  }

  private loadServerData(): void {
    this.loadGovernorates();
    this.loadAreasList();
    this.loadTemplates();
    this.loadPatterns();
    this.loadTemplatePatterns();
    this.loadLocations();
  }

  loadGovernorates(): void {
    this.mapviewService.getGovernorates().subscribe({
      next: (data) => {
        console.log('Governorates:', data);
        this.governorates = data || [];
      },
      error: (err) => console.error('Error loading governorates:', err),
    });
  }

  private loadAreasList(): void {
    this.mapviewService.getAreas(0).subscribe({
      next: (data: any) => {
        this.areas = data || [];
      },
      error: (error: any) => {
        console.error('Error loading areas:', error);
      },
    });
  }

  private loadAreas(governorateId: number): void {
    this.mapviewService.getAreas(governorateId).subscribe({
      next: (data: any) => {
        this.areas = data || [];
        this.trafficForm.get('area')?.reset();
      },
      error: (error: any) => {
        console.error('Error loading areas:', error);
      },
    });
  }

  private loadTemplates(): void {
    this.mapviewService.getTemplates().subscribe({
      next: (data: any) => {
        this.templates = data || [];
      },
      error: (error: any) => {
        console.error('Error loading templates:', error);
      },
    });
  }

  private loadPatterns(): void {
    this.mapviewService.getPatterns().subscribe({
      next: (data: any) => {
        this.lightPatterns = data || [];
      },
      error: (error: any) => {
        console.error('Error loading patterns:', error);
      },
    });
  }

  private loadTemplatePatterns(): void {
    this.mapviewService.getTemplatePatterns().subscribe({
      next: (data: any) => {
        this.templatePatterns = data || [];
      },
      error: (error: any) => {
        console.error('Error loading template patterns:', error);
      },
    });
  }

  loadLocations(): void {
    this.mapviewService.getLocations().subscribe({
      next: (data: any) => {
        console.log('Raw locations response:', data);
        this.locations = Array.isArray(data)
          ? data
          : data?.data || data?.result || [];
        this.addLocationMarkers();
      },
      error: (err) => console.error('Error loading locations:', err),
    });
  }

  private addLocationMarkers(): void {
    // Clear existing markers
    this.markers.forEach((marker) => this.map.removeLayer(marker));
    this.markers = [];

    // Add markers for each location
    this.locations.forEach((location: Location) => {
      const lat = parseFloat(location.Latitude);
      const lng = parseFloat(location.Longitude);

      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], { icon: this.trafficIcon })
        .addTo(this.map)
        .bindPopup(
          `<b>${location.Name || ''}</b><br />${location.IPAddress || ''}`
        );

      // Click event for marker
      marker.on('click', () => {
        if (this.selectedMarker) {
          this.selectedMarker.setIcon(this.trafficIcon);
        }
        marker.setIcon(this.selectedIcon);
        this.selectedMarker = marker;
        this.selectedLocation = location;
        this.map.setView([lat, lng], 18);
        this.populateFormWithLocation(location);
      });

      this.markers.push(marker);
    });
  }

  private populateFormWithLocation(location: Location): void {
    this.trafficForm.patchValue({
      governorate: location.GovernerateID,
      area: location.AreaID,
      name: location.Name,
      latitude: location.Latitude,
      longitude: location.Longitude,
      ipAddress: location.IPAddress,
      template: location.TemplateID || '0',
      greenTime: location.Green || 30,
      amberTime: location.Amber || 10,
      redTime: location.Red || 30,
    });
  }

  private handleTemplateChange(templateId: string): void {
    if (templateId && templateId !== '0') {
      console.log('Template selected:', templateId);
    } else {
      console.log('No template selected');
    }
  }

  private clearForm(): void {
    this.trafficForm.patchValue({
      name: '',
      latitude: '',
      longitude: '',
      ipAddress: '',
      template: '0',
      greenTime: 0,
      amberTime: 0,
      redTime: 0,
    });
  }

  submitForm(): void {
    if (this.trafficForm.valid) {
      const formData = this.trafficForm.value;

      const locationData = {
        ID: this.selectedLocation ? this.selectedLocation.ID : 0,
        GovernerateName: this.getGovernorateName(formData.governorate),
        AreaName: this.getAreaName(formData.area),
        AreaID: formData.area,
        Name: formData.name,
        Longitude: formData.longitude,
        Latitude: formData.latitude,
        IPAddress: formData.ipAddress,
        TemplateID: formData.template === '0' ? 0 : formData.template,
        LightPatternID: formData.template === '0' ? 0 : null,
        R: formData.redTime,
        A: formData.amberTime,
        G: formData.greenTime,
      };

      this.mapviewService.setLocation(locationData).subscribe({
        next: (response: any) => {
          if (response === 'Ok' || response === true) {
            alert('Location saved successfully!');
            this.loadLocations();
          } else {
            alert('Error saving location: ' + response);
          }
        },
        error: (error: any) => {
          console.log(error);
          console.log(error.message);
          alert('Failed to save location: ' + error.message);
        },
      });
    } else {
      Object.keys(this.trafficForm.controls).forEach((key) => {
        this.trafficForm.get(key)?.markAsTouched();
      });
    }
  }

  private getGovernorateName(id: number): string {
    const gov = this.governorates.find((g) => g.ID === id);
    return gov ? gov.Name : '';
  }

  private getAreaName(id: number): string {
    const area = this.areas.find((a) => a.ID === id);
    return area ? area.Name : '';
  }

  applyChanges(): void {
    this.submitForm();
  }

  deleteLocation(): void {
    if (
      this.selectedLocation &&
      confirm('Are you sure you want to delete this location?')
    ) {
      this.mapviewService.deleteLocation(this.selectedLocation.ID).subscribe({
        next: () => {
          alert('Location deleted successfully!');
          this.selectedLocation = null;
          this.loadLocations(); // refresh markers
        },
        error: (err) => {
          alert('Failed to delete location: ' + err.message);
        },
      });
    }
  }
}
