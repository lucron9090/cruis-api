import { ContentSource } from './content-source';
import { ModelAndVehicleId } from './model-and-vehicle-id';

export interface ModelsResponseResponse {
  body?: {
    contentSource: ContentSource;
    models: ModelAndVehicleId[];
  };
}

