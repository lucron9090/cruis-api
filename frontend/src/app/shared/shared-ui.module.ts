import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ButtonComponent } from './ui/button/button.component';
import { CardComponent } from './ui/card/card.component';
import { InputComponent } from './ui/input/input.component';

@NgModule({
    declarations: [
        ButtonComponent,
        CardComponent,
        InputComponent
    ],
    imports: [
        CommonModule
    ],
    exports: [
        ButtonComponent,
        CardComponent,
        InputComponent
    ]
})
export class SharedUiModule { }
