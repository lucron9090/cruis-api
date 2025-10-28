/* tslint:disable */
/* eslint-disable */
export { ContentSource } from './models/content-source';
export { FilterTabType } from './models/filter-tab-type';
export { IntervalType } from './models/interval-type';
export { MaintenanceScheduleSeverity } from './models/maintenance-schedule-severity';
export { ModelAndVehicleId } from './models/model-and-vehicle-id';
export { EngineDetails } from './models/engine-details';
export { MakeListResponse } from './models/make-list-response';
export { ModelAndVehicleIdListResponse } from './models/model-and-vehicle-id-list-response';
export { ModelsResponseResponse } from './models/models-response-response';
export { StringResponse } from './models/string-response';
export { VinVehicleResponseResponse } from './models/vin-vehicle-response-response';
export { Labor } from './models/labor';
export { PartLineItem } from './models/part-line-item';
export { Indicator } from './models/indicator';
export { MaintenanceScheduleApp } from './models/maintenance-schedule-app';
export { MaintenanceSchedulesByInterval } from './models/maintenance-schedules-by-interval';
export { Note } from './models/note';

// Additional exports
export { ArticleResponse } from './models/article-response';
export { EmptyResponse } from './models/empty-response';
export { LogEntry } from './models/log-entry';
export { PartLineItemListResponse } from './models/part-line-item-list-response';
export { SearchResultsResponse } from './models/search-results-response';
export { StringListResponse } from './models/string-list-response';
export { VehicleDeltaReportListResponse } from './models/vehicle-delta-report-list-response';
export { Feedback } from './models/feedback';
export { FeedbackConfigurationResponse } from './models/feedback-configuration-response';
export { UiUserSettingsResponse } from './models/ui-user-settings-response';
export { GetVehiclesRequest } from './models/get-vehicles-request';
export { ArticleBookmarkResponse } from './models/article-bookmark-response';
export { LaborResponse } from './models/labor-response';
export { MaintenanceSchedulesByFrequencyResponse } from './models/maintenance-schedules-by-frequency-response';
export { MaintenanceSchedulesByIntervalResponse } from './models/maintenance-schedules-by-interval-response';

// Additional model stubs
export interface UiUserSettings {
  [key: string]: any;
}

export interface ArticleDetails {
  id?: string;
  title?: string;
  [key: string]: any;
}

export interface FilterTab {
  name?: string;
  displayName?: string;
  articleTrailId?: string;
  [key: string]: any;
}

export interface VehicleGeoBlockingDetails {
  blocked?: boolean;
  message?: string;
  [key: string]: any;
}

export interface IndicatorsWithMaintenanceSchedulesResponse {
  data?: any;
  [key: string]: any;
}
