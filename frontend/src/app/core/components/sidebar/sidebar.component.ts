import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Observable } from 'rxjs';
import { UserSettingsService } from '~/core/user-settings/user-settings.service';
import { VehicleSelectionFacade } from '~/vehicle-selection/state/state/vehicle-selection.facade';

@Component({
    selector: 'mtr-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
    @Input() isOpen = true;
    @Output() closeSidebar = new EventEmitter<void>();

    constructor(
        public userSettingsService: UserSettingsService,
        public vehicleSelectionFacade: VehicleSelectionFacade
    ) { }
}
