import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { ArticleDetails } from '~/generated/api/models';

@Component({
  selector: 'mtr-search-results-item',
  templateUrl: './search-results-item.component.html',
  styleUrls: ['./search-results-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResultsItemComponent {
  @HostBinding('class.selected')
  @Input()
  isSelected = false;

  @HostBinding('class.full-screen')
  @Input()
  isFullScreen: boolean | null = false;

  @Input() details!: Partial<ArticleDetails>;

  @HostBinding('attr.id')
  get id() {
    return this.details.id;
  }

  get thumbnailUrl(): string {
    const t = (this.details && (this.details as any).thumbnailHref) || '';
    if (!t) return '';
    // If already absolute (http/https) return as-is
    if (/^https?:\/\//i.test(t)) return t;
    // Make relative paths absolute to the site root to avoid missing-slash issues
    return '/' + t.replace(/^\/+/, '');
  }

  imgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && img.src) {
      img.src = 'assets/images/vehicle-select.svg';
    }
  }
}
