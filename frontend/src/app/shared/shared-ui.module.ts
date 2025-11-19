import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from './ui/button/button.component';
import { CardComponent } from './ui/card/card.component';
import { InputComponent } from './ui/input/input.component';
import { SelectComponent } from './ui/select/select.component';
import { ModalComponent } from './ui/modal/modal.component';
import { TabsComponent } from './ui/tabs/tabs.component';
import { BadgeComponent } from './ui/badge/badge.component';
import { SkeletonComponent } from './ui/skeleton/skeleton.component';
import { BreadcrumbComponent } from './ui/breadcrumb/breadcrumb.component';
import { TooltipDirective } from './ui/tooltip/tooltip.directive';
import { TreeComponent } from './ui/tree/tree.component';

@NgModule({
    declarations: [
        ButtonComponent,
        CardComponent,
        InputComponent,
        SelectComponent,
        ModalComponent,
        TabsComponent,
        BadgeComponent,
        SkeletonComponent,
        BreadcrumbComponent,
        TooltipDirective,
        TreeComponent
    ],
    imports: [
        CommonModule,
        RouterModule
    ],
    exports: [
        ButtonComponent,
        CardComponent,
        InputComponent,
        SelectComponent,
        ModalComponent,
        TabsComponent,
        BadgeComponent,
        SkeletonComponent,
        BreadcrumbComponent,
        TooltipDirective,
        TreeComponent
    ]
})
export class SharedUiModule { }
