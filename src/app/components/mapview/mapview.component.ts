import { AfterViewInit, Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import * as L from 'leaflet';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

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

  governorates: GovernorateDto[] = [];
  areas: Area[] = [];
  templates: Template[] = [];
  locations: Location[] = [];
  lightPatterns: any[] = [];
  templatePatterns: any[] = [];

  // Leaflet
  private map!: L.Map;
  private markers: L.Marker[] = [];
  private editMarker!: L.Marker;           // ماركر التحرير (المربوط بالحقول)
  selectedMarker: L.Marker | null = null;  // آخر ماركر متحدد
  selectedLocation: Location | null = null;

  constructor(private fb: FormBuilder, private mapviewService: MapviewService) {}

  // أيقونات الماركر
  private trafficIcon = L.icon({
    iconUrl: 'assets/img/traffic-light-305721.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  });
  private selectedIcon = L.icon({
    iconUrl: 'assets/img/traffic-light-selected.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -30],
  });

  // ================= Lifecycle =================
  ngOnInit(): void {
    this.initForm();
    this.loadServerData();

    // احسب الأحمر تلقائيًا (أحمر = أخضر + أصفر)
    this.trafficForm.get('greenTime')?.valueChanges.subscribe(() => this.calculateRedTime());
    this.trafficForm.get('amberTime')?.valueChanges.subscribe(() => this.calculateRedTime());

    // عند تغيير التمبلِت طبّق أزمنة لو موجودة
    this.trafficForm.get('template')?.valueChanges.subscribe((value) => {
      this.handleTemplateChange(value);
    });

    // تحميل مناطق عند تغيير المحافظة
    this.trafficForm.get('governorate')?.valueChanges.subscribe((value) => {
      const govId = +value;
      if (govId) this.loadAreas(govId);
      else {
        this.areas = [];
        this.trafficForm.get('area')?.reset();
      }
    });
  }

  ngAfterViewInit(): void {
    this.initMap();

    // ماركر افتراضي مربوط بالحقول (القاهرة)
    this.editMarker = L.marker([30.0444, 31.2357], { icon: this.trafficIcon }).addTo(this.map);
    this.map.setView([30.0444, 31.2357], 13);

    // اربط الحقول لتحريك الماركر تلقائيًا
    this.bindLatLngInputs();

    // إصلاح حجم الخريطة لو كانت داخل تبويب/كونتينر
    setTimeout(() => this.map.invalidateSize(), 50);
  }

  // ================= Form =================
  private initForm(): void {
    this.trafficForm = this.fb.group({
      governorate: ['', Validators.required],
      area: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]],
      latitude: ['', [Validators.required, this.latitudeValidator.bind(this)]],
      longitude: ['', [Validators.required, this.longitudeValidator.bind(this)]],
      ipAddress: ['', [Validators.required, this.ipValidator.bind(this)]],
      template: ['0'],
      greenTime: [30, [Validators.min(0), Validators.max(1000)]],
      amberTime: [10, [Validators.min(0), Validators.max(1000)]],
      redTime: [{ value: 40, disabled: true }, [Validators.min(0), Validators.max(1000)]],
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.trafficForm.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  // ================= Map =================
  private initMap(): void {
    this.map = L.map('map', {
      center: [30.0332459, 31.1679859],
      zoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // كليك على الخريطة يحدّث الحقول + يحرك ماركر التحرير
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = +e.latlng.lat.toFixed(6);
      const lng = +e.latlng.lng.toFixed(6);
      this.trafficForm.patchValue({ latitude: lat, longitude: lng });
      this.updateEditMarker(lat, lng);
    });
  }

  private bindLatLngInputs() {
    const latCtrl = this.trafficForm.get('latitude');
    const lngCtrl = this.trafficForm.get('longitude');
    if (!latCtrl || !lngCtrl) return;

    combineLatest([latCtrl.valueChanges, lngCtrl.valueChanges])
      .pipe(
        debounceTime(150),
        distinctUntilChanged((a: any, b: any) => a[0] === b[0] && a[1] === b[1])
      )
      .subscribe(([latVal, lngVal]) => {
        const lat = Number(String(latVal).replace(',', '.'));
        const lng = Number(String(lngVal).replace(',', '.'));
        const latOk = Number.isFinite(lat) && lat >= -90 && lat <= 90;
        const lngOk = Number.isFinite(lng) && lng >= -180 && lng <= 180;
        if (latOk && lngOk) this.updateEditMarker(lat, lng);
      });
  }

  private updateEditMarker(lat: number, lng: number): void {
    if (!this.editMarker) {
      this.editMarker = L.marker([lat, lng], { icon: this.trafficIcon }).addTo(this.map);
    } else {
      this.editMarker.setLatLng([lat, lng]);
    }
    this.map.setView([lat, lng], Math.max(this.map.getZoom(), 15));
  }

  // ================= Template Change Logic =================
  private handleTemplateChange(templateId: string | number): void {
    const id = typeof templateId === 'string' ? parseInt(templateId, 10) : templateId;
    if (!id || id === 0) {
      this.calculateRedTime();
      return;
    }

    // أولوية: بيانات الأزمنة من templatePatterns لو متوفرة
    const foundPattern = this.templatePatterns?.find((p: any) => +p.TemplateID === +id) ?? null;
    if (foundPattern) {
      const g = Number(foundPattern.Green ?? foundPattern.G ?? 30);
      const a = Number(foundPattern.Amber ?? foundPattern.A ?? 10);
      const r = Number(foundPattern.Red ?? foundPattern.R ?? g + a);
      this.trafficForm.patchValue({ greenTime: g, amberTime: a, redTime: r }, { emitEvent: false });
      return;
    }

    // بديل: لو templates نفسها فيها الأزمنة
    const t = this.templates?.find((x) => +(<any>x).ID === +id) as any;
    if (t && (t.Green !== undefined || t.Amber !== undefined || t.Red !== undefined)) {
      const g = Number(t.Green ?? 30);
      const a = Number(t.Amber ?? 10);
      const r = Number(t.Red ?? g + a);
      this.trafficForm.patchValue({ greenTime: g, amberTime: a, redTime: r }, { emitEvent: false });
      return;
    }

    this.calculateRedTime();
  }

  // ================= Validators =================
  private latitudeValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') return { invalidLatitude: true };
    const num = Number(String(value).replace(',', '.'));
    return Number.isFinite(num) && num >= -90 && num <= 90 ? null : { invalidLatitude: true };
  }

  private longitudeValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') return { invalidLongitude: true };
    const num = Number(String(value).replace(',', '.'));
    return Number.isFinite(num) && num >= -180 && num <= 180 ? null : { invalidLongitude: true };
  }

  private ipValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return { invalidIp: true };
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(value) ? null : { invalidIp: true };
  }

  private calculateRedTime(): void {
    const green = Number(this.trafficForm.get('greenTime')?.value) || 0;
    const amber = Number(this.trafficForm.get('amberTime')?.value) || 0;
    this.trafficForm.get('redTime')?.setValue(green + amber, { emitEvent: false });
  }

  // ================= Data Loading =================
  private loadServerData(): void {
    this.loadGovernorates();
    this.loadAreasList();
    this.loadTemplates();
    this.loadPatterns();
    this.loadTemplatePatterns();
    this.loadLocations(); // دي اللي بترسم الماركرات من الـ API
  }

  loadGovernorates(): void {
    this.mapviewService.getGovernorates().subscribe({
      next: (data) => (this.governorates = data || []),
      error: (err) => console.error('Error loading governorates:', err),
    });
  }

  private loadAreasList(): void {
    this.mapviewService.getAreas(0).subscribe({
      next: (data: any) => (this.areas = data || []),
      error: (error: any) => console.error('Error loading areas:', error),
    });
  }

  private loadAreas(governorateId: number): void {
    this.mapviewService.getAreas(governorateId).subscribe({
      next: (data: any) => {
        this.areas = data || [];
        this.trafficForm.get('area')?.reset();
      },
      error: (error: any) => console.error('Error loading areas:', error),
    });
  }

  private loadTemplates(): void {
    this.mapviewService.getTemplates().subscribe({
      next: (data: any) => (this.templates = data || []),
      error: (error: any) => console.error('Error loading templates:', error),
    });
  }

  private loadPatterns(): void {
    this.mapviewService.getPatterns().subscribe({
      next: (data: any) => (this.lightPatterns = data || []),
      error: (error: any) => console.error('Error loading patterns:', error),
    });
  }

  private loadTemplatePatterns(): void {
    this.mapviewService.getTemplatePatterns().subscribe({
      next: (data: any) => (this.templatePatterns = data || []),
      error: (error: any) => console.error('Error loading template patterns:', error),
    });
  }

  loadLocations(): void {
    this.mapviewService.getLocations().subscribe({
      next: (data: any) => {
        console.log("data is here " +data)
        // لازم service يرجّع بيانات SigneControlBox من: http://192.168.1.43/api/get/control-box
        this.locations = Array.isArray(data) ? data : data?.data || data?.result || [];
        this.addLocationMarkers();
      },
      error: (err) => console.error('Error loading locations:', err),
    });
  }

  private addLocationMarkers(): void {
    // إزالة العلامات القديمة
    this.markers.forEach((m) => this.map.removeLayer(m));
    this.markers = [];

    const bounds: L.LatLngExpression[] = [];

    this.locations.forEach((location: Location) => {
      // دعم "31,234" أو "31.234"
      const lat = Number(String(location.Latitude).replace(',', '.'));
      const lng = Number(String(location.Longitude).replace(',', '.'));
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const marker = L.marker([lat, lng], { icon: this.trafficIcon })
        .addTo(this.map)
        .bindPopup(
          `<b>${location.Name || ''}</b><br/>IP: ${location.IPAddress || ''}<br/>Lat: ${lat.toFixed(
            6
          )} • Lng: ${lng.toFixed(6)}`
        );

      marker.on('click', () => {
        if (this.selectedMarker) this.selectedMarker.setIcon(this.trafficIcon);
        marker.setIcon(this.selectedIcon);
        this.selectedMarker = marker;
        this.selectedLocation = location;
        this.map.setView([lat, lng], 18);
        this.populateFormWithLocation(location);
      });

      this.markers.push(marker);
      bounds.push([lat, lng]);
    });

    if (bounds.length) this.map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [30, 30] });
  }

  private populateFormWithLocation(location: Location): void {
    this.trafficForm.patchValue(
      {
        governorate: location.GovernerateID,
        area: location.AreaID,
        name: location.Name,
        latitude: String(location.Latitude).replace(',', '.'),
        longitude: String(location.Longitude).replace(',', '.'),
        ipAddress: location.IPAddress,
        template: location.TemplateID || '0',
        greenTime: (location as any).Green ?? 30,
        amberTime: (location as any).Amber ?? 10,
        redTime:
          (location as any).Red ??
          ((location as any).Green ?? 0) + ((location as any).Amber ?? 0),
      },
      { emitEvent: false }
    );

    if (location.TemplateID) this.handleTemplateChange(location.TemplateID);
    // حرّك ماركر التحرير لنفس المكان
    const lat = Number(String(location.Latitude).replace(',', '.'));
    const lng = Number(String(location.Longitude).replace(',', '.'));
    if (Number.isFinite(lat) && Number.isFinite(lng)) this.updateEditMarker(lat, lng);
  }

  // ================= UI Handlers =================
  onGovernorateChange(event: any): void {
    const govId = +event.target.value;
    if (!govId) {
      this.areas = [];
      this.trafficForm.get('area')?.reset();
      return;
    }
    this.loadAreas(govId);
  }

  submitForm(): void {
    if (this.trafficForm.valid) {
      const v = this.trafficForm.value;
      const payload = {
        ID: this.selectedLocation ? this.selectedLocation.ID : 0,
        GovernerateName: this.getGovernorateName(+v.governorate),
        AreaName: this.getAreaName(+v.area),
        AreaID: +v.area,
        Name: v.name,
        Longitude: v.longitude,
        Latitude: v.latitude,
        IPAddress: v.ipAddress,
        TemplateID: v.template === '0' ? 0 : +v.template,
        LightPatternID: v.template === '0' ? 0 : null,
        R: +v.redTime,
        A: +v.amberTime,
        G: +v.greenTime,
      };

      this.mapviewService.setLocation(payload).subscribe({
        next: (response: any) => {
          if (response === 'Ok' || response === true) {
            alert('Location saved successfully!');
            this.selectedLocation = null;
            this.loadLocations();
          } else {
            alert('Error saving location: ' + response);
          }
        },
        error: (error: any) => {
          console.error(error);
          alert('Failed to save location: ' + (error?.message || 'Unknown error'));
        },
      });
    } else {
      Object.keys(this.trafficForm.controls).forEach((key) => {
        this.trafficForm.get(key)?.markAsTouched();
      });
    }
  }

  applyChanges(): void {
    this.submitForm();
  }

  deleteLocation(): void {
    if (this.selectedLocation && confirm('Are you sure you want to delete this location?')) {
      this.mapviewService.deleteLocation(this.selectedLocation.ID).subscribe({
        next: () => {
          alert('Location deleted successfully!');
          this.selectedLocation = null;
          this.loadLocations();
        },
        error: (err) => alert('Failed to delete location: ' + (err?.message || 'Unknown error')),
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
}
