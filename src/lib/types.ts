export interface ServiceRecord {
  id: number;
  date: string;
  tech: string;
  bay: string;
  services: string[];
  notes: string;
  ts: string;
}

export interface UnitData {
  bay: string;
  records: ServiceRecord[];
}

export type UnitsData = Record<string, UnitData>;

export type UnitStatus = "good" | "due" | "overdue" | "never";
