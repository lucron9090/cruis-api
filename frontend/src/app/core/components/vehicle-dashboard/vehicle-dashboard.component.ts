import { ChangeDetectionStrategy, Component } from '@angular/core';
import { combineLatest, Observable, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { UserSettingsService } from '~/core/user-settings/user-settings.service';
import { ContentSource } from '~/generated/api/models';
import { filterNullish } from '~/utilities';
import { VehicleSelectionFacade } from '~/vehicle-selection/state/state/vehicle-selection.facade';
import { SearchResultsFacade } from '~/search/state/search-results.facade';
import { AssetsFacade } from '~/assets/state/assets.facade';

interface VehicleInfo {
  name: string;
  year?: string;
  make?: string;
  model?: string;
  engine?: string;
  vin?: string;
  contentSource?: string;
}

@Component({
  selector: 'mtr-vehicle-dashboard',
  templateUrl: './vehicle-dashboard.component.html',
  styleUrls: ['./vehicle-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleDashboardComponent {
  constructor(
    public vehicleSelectionFacade: VehicleSelectionFacade,
    public userSettingsService: UserSettingsService,
    public searchResultsFacade: SearchResultsFacade,
    public assetsFacade: AssetsFacade
  ) {}

  vehicleInfo$: Observable<VehicleInfo | null> = combineLatest([
    this.vehicleSelectionFacade.activeVehicleId$.pipe(filterNullish()),
    this.vehicleSelectionFacade.contentSource$.pipe(filterNullish()),
    this.vehicleSelectionFacade.vehicleVin$,
    this.vehicleSelectionFacade.motorVehicleId$
  ]).pipe(
    debounceTime(0),
    switchMap(([vehicleId, contentSource, vin, motorVehicleId]) =>
      this.vehicleSelectionFacade.getVehicleYMM(contentSource, motorVehicleId ?? vehicleId).pipe(
        map((vehicleName) => {
          // Handle case where vehicle name might not be available
          const displayName = vehicleName || 'Vehicle Selected';
          
          // Parse year, make, model from vehicle name (format: "2020 Toyota Camry")
          const parts = displayName.split(' ');
          const year = parts.length > 0 && !isNaN(Number(parts[0])) ? parts[0] : undefined;
          const make = parts.length > 1 ? parts[1] : undefined;
          const model = parts.length > 2 ? parts.slice(2).join(' ') : displayName;
          
          return {
            name: displayName,
            year,
            make,
            model,
            vin: vin || undefined,
            contentSource: contentSource === ContentSource.Motor ? 'YourCar' : contentSource
          } as VehicleInfo;
        }),
        catchError(error => {
          console.warn('Error fetching vehicle name, using fallback', error);
          // Return a fallback vehicle info object
          return of({
            name: 'Vehicle Selected',
            year: undefined,
            make: undefined,
            model: 'Please select a vehicle',
            vin: vin || undefined,
            contentSource: contentSource === ContentSource.Motor ? 'YourCar' : contentSource
          } as VehicleInfo);
        })
      )
    ),
    distinctUntilChanged()
  );

  // Recent documents (mock data for now - can be enhanced with real tracking)
  recentDocuments$: Observable<Array<{title: string; category: string; route: string[]; queryParams: any}>> = this.vehicleInfo$.pipe(
    map(() => {
      // TODO: Implement real recent documents tracking with localStorage
      // For now, return empty array
      return [];
    })
  );

  // Popular articles (mock data for now - can be enhanced with analytics)
  popularArticles$: Observable<Array<{title: string; category: string; route: string[]; queryParams: any}>> = this.vehicleInfo$.pipe(
    map((vehicle) => {
      if (!vehicle) return [];
      
      // Mock popular articles - can be replaced with real analytics data
      return [
        {
          title: 'Engine Oil and Filter Replacement',
          category: 'Maintenance Procedures',
          route: ['/docs/Procedures'],
          queryParams: {}
        },
        {
          title: 'Brake Pad and Rotor Replacement',
          category: 'Brake Service',
          route: ['/docs/Procedures'],
          queryParams: {}
        },
        {
          title: 'Tire Rotation and Inspection',
          category: 'Maintenance Procedures',
          route: ['/docs/Procedures'],
          queryParams: {}
        }
      ];
    })
  );
}

