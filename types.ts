
export interface ExtractedData {
  hospitalDept: string;
  referenceId: string;
  hn: string;
  patientName: string;
  category: string;
  date: string;
  rawText?: string;
}

export interface ScanRecord extends ExtractedData {
  id: string;
  timestamp: string;
  thumbnail: string;
}
