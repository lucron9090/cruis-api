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
    let t = (this.details && (this.details as any).thumbnailHref) || '';
    if (!t) return '';
    // Some malformed values may include extra text (e.g. "220 Request Method GET").
    // Trim at first whitespace/newline to be safe.
    t = String(t).trim().split(/\s+/)[0];
    // If it still looks empty, bail out
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
