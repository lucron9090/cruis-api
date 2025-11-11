import { ChangeDetectionStrategy, Component } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { UserSettingsService } from '~/core/user-settings/user-settings.service';
import { ContentSource } from '~/generated/api/models';
import { filterNullish } from '~/utilities';
import { VehicleSelectionFacade } from '~/vehicle-selection/state/state/vehicle-selection.facade';

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
    public userSettingsService: UserSettingsService
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
          if (!vehicleName) return null;
          
          // Parse year, make, model from vehicle name (format: "2020 Toyota Camry")
          const parts = vehicleName.split(' ');
          const year = parts.length > 0 ? parts[0] : undefined;
          const make = parts.length > 1 ? parts[1] : undefined;
          const model = parts.length > 2 ? parts.slice(2).join(' ') : undefined;
          
          return {
            name: vehicleName,
            year,
            make,
            model,
            vin: vin || undefined,
            contentSource: contentSource === ContentSource.Motor ? 'Motor' : contentSource
          } as VehicleInfo;
        })
      )
    ),
    distinctUntilChanged()
  );
}

