
import * as XLSX from 'xlsx';
import { ScanRecord } from '../types';

export const exportToExcel = (records: ScanRecord[]) => {
  if (records.length === 0) return;

  const dataForExcel = records.map(record => ({
    'Date Scanned': record.timestamp,
    'Hospital/Dept': record.hospitalDept,
    'Ref ID': record.referenceId,
    'HN': record.hn,
    'Name': record.patientName,
    'Category': record.category,
    'Label Date': record.date
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Scanned Records");

  // Fix column widths
  const wscols = [
    { wch: 20 }, // Timestamp
    { wch: 15 }, // Dept
    { wch: 20 }, // Ref ID
    { wch: 15 }, // HN
    { wch: 25 }, // Name
    { wch: 10 }, // Cat
    { wch: 15 }, // Date
  ];
  worksheet['!cols'] = wscols;

  XLSX.writeFile(workbook, `LabelScans_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
