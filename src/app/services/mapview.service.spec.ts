import { TestBed } from '@angular/core/testing';

import { MapviewService } from './mapview.service';

describe('MapviewService', () => {
  let service: MapviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
