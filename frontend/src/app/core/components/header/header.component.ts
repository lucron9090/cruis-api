import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { UserSettingsService } from '~/core/user-settings/user-settings.service';
import { VehicleSelectionFacade } from '~/vehicle-selection/state/state/vehicle-selection.facade';

@Component({
  selector: 'mtr-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() toggleMobileMenu = new EventEmitter<void>();

  constructor(
    public userSettingsService: UserSettingsService,
    public vehicleSelectionFacade: VehicleSelectionFacade
  ) {}
}
