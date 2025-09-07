import { TestBed } from '@angular/core/testing';

import { TrafficPointConfigService } from './traffic-point-config.service';

describe('TrafficPointConfigService', () => {
  let service: TrafficPointConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrafficPointConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
