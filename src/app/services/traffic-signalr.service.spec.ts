import { TestBed } from '@angular/core/testing';

import { TrafficSignalrService } from './traffic-signalr.service';

describe('TrafficSignalrService', () => {
  let service: TrafficSignalrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrafficSignalrService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
