import { Component, OnInit } from '@angular/core';
import { SearchService } from 'src/app/services/SignalR/search.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  title = 'Traffic Signals Dashboard';
  searchText = '';

  constructor(private searchService: SearchService) {}

  onSearchChange(value: string) {
    this.searchService.setSearch(value);
  }
  ngOnInit(): void {}
}
