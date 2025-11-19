import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface TreeNode {
    id: string | number;
    label: string;
    children?: TreeNode[];
    expanded?: boolean;
    icon?: string; // Optional icon class or name
}

@Component({
    selector: 'mtr-tree',
    templateUrl: './tree.component.html',
    styleUrls: ['./tree.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeComponent {
    @Input() nodes: TreeNode[] = [];
    @Input() activeNodeId: string | number | null = null;
    @Output() nodeClick = new EventEmitter<TreeNode>();

    toggleNode(node: TreeNode, event: Event): void {
        event.stopPropagation();
        if (node.children && node.children.length > 0) {
            node.expanded = !node.expanded;
        }
        this.nodeClick.emit(node);
    }

    onChildNodeClick(node: TreeNode): void {
        this.nodeClick.emit(node);
    }
}
