export interface Labor {
  id?: string;
  description?: string;
  time?: number;
  mainOperation?: any;
  notes?: any[];
  isPartsEntitlementActive?: boolean;
  optionalOperations?: any[];
  includedOperations?: any[];
  parts?: any[];
  vehicleAttributes?: string;
}

