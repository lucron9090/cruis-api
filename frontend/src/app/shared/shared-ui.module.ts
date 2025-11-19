import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ButtonComponent } from './ui/button/button.component';
import { CardComponent } from './ui/card/card.component';
import { InputComponent } from './ui/input/input.component';
import { SelectComponent } from './ui/select/select.component';
import { ModalComponent } from './ui/modal/modal.component';
import { TabsComponent } from './ui/tabs/tabs.component';
import { BadgeComponent } from './ui/badge/badge.component';

@NgModule({
    declarations: [
        ButtonComponent,
        CardComponent,
        InputComponent,
        SelectComponent,
        ModalComponent,
        TabsComponent,
        BadgeComponent
    ],
    imports: [
        CommonModule
    ],
    exports: [
        ButtonComponent,
        CardComponent,
        InputComponent,
        SelectComponent,
        ModalComponent,
        TabsComponent,
        BadgeComponent
    ]
})
export class SharedUiModule { }
