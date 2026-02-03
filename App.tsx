
import React, { useState, useRef } from 'react';
import { extractMultipleDataFromImage } from './services/geminiService';
import { exportToExcel } from './services/excelService';
import { ScanRecord } from './types';

const App: React.FC = () => {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (files: FileList) => {
    setIsProcessing(true);
    setError(null);
    setProgress({ current: 0, total: files.length });
    
    const newRecordsList: ScanRecord[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(prev => ({ ...prev, current: i + 1 }));
      
      try {
        const base64 = await readFileAsBase64(file);
        setPreviewImage(base64); 
        
        // เรียกใช้ระบบวิเคราะห์ข้อมูลอัตโนมัติ
        const extractedResults = await extractMultipleDataFromImage(base64);
        
        extractedResults.forEach(data => {
          newRecordsList.push({
            ...data,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleString('th-TH'),
            thumbnail: base64
          });
        });
      } catch (err: any) {
        console.error(`Error:`, err);
        // แสดงข้อความ Error ที่เข้าใจง่ายขึ้น
        if (err.message.includes('API Key')) {
          setError('ระบบประมวลผลไม่พร้อมใช้งาน (กรุณาตรวจสอบการเชื่อมต่อ Engine)');
        } else {
          setError(`ไม่สามารถอ่านข้อมูลจากภาพได้: ${err.message}`);
        }
      }
    }

    setRecords(prev => [...newRecordsList, ...prev]);
    setIsProcessing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const deleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const clearAll = () => {
    if (window.confirm("คุณต้องการล้างข้อมูลทั้งหมดใช่หรือไม่?")) {
      setRecords([]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-slate-900 p-2.5 rounded-2xl">
              <i className="fas fa-expand text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">VISION SCAN</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Processing</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {records.length > 0 && (
              <button 
                onClick={clearAll}
                className="hover:bg-red-50 text-slate-400 hover:text-red-500 w-10 h-10 rounded-xl transition-all flex items-center justify-center border border-transparent hover:border-red-100"
                title="Clear all"
              >
                <i className="fas fa-trash-can"></i>
              </button>
            )}
            <button 
              onClick={() => exportToExcel(records)}
              disabled={records.length === 0 || isProcessing}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white px-6 py-3 rounded-2xl flex items-center space-x-2 transition-all font-bold text-sm shadow-lg shadow-slate-200"
            >
              <i className="fas fa-file-export"></i>
              <span>ส่งออกไฟล์ Excel</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto w-full p-6 lg:p-10 flex flex-col lg:flex-row gap-10">
        
        {/* Left: Control Panel */}
        <div className="w-full lg:w-[350px] shrink-0 space-y-6">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200/60">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Scanner Input</h2>
            
            <div 
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`relative overflow-hidden aspect-square rounded-[24px] border-2 border-dashed flex flex-col items-center justify-center transition-all group ${
                isProcessing 
                ? 'border-slate-200 bg-slate-50 cursor-wait' 
                : 'border-slate-300 cursor-pointer hover:border-slate-900 hover:bg-slate-50'
              }`}
            >
              {isProcessing && <div className="scanning-line"></div>}
              
              <div className={`w-16 h-16 rounded-full mb-4 flex items-center justify-center transition-all ${isProcessing ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 text-slate-900 group-hover:scale-110'}`}>
                <i className={`fas ${isProcessing ? 'fa-sync fa-spin' : 'fa-plus'} text-2xl`}></i>
              </div>
              <p className="text-sm font-bold text-slate-900">
                {isProcessing ? 'กำลังอ่านข้อมูล...' : 'เพิ่มรูปภาพแผ่นป้าย'}
              </p>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">PNG, JPG หรือภาพถ่าย</p>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
                multiple
              />
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl font-medium leading-relaxed">
                <i className="fas fa-circle-exclamation mr-2"></i>
                {error}
              </div>
            )}

            {previewImage && (
              <div className="mt-8 pt-8 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Current Preview</p>
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 relative">
                  <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  {isProcessing && <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                  </div>}
                </div>
              </div>
            )}
          </div>
          
          <div className="p-1 px-4 text-center">
             <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-loose">
               System ID: VS-PRO-2025<br/>
               Processing Module: V3.4.1
             </p>
          </div>
        </div>

        {/* Right: Records Table */}
        <div className="flex-grow">
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-full">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">บันทึกข้อมูล</h2>
              <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase">
                {records.length} Records
              </span>
            </div>

            <div className="flex-grow overflow-x-auto">
              {records.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-50">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">ภาพ</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">รายละเอียดผู้ป่วย</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">ข้อมูลการตรวจ</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">สถานที่ / วันที่</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                            <img src={record.thumbnail} className="w-full h-full object-cover" />
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="text-sm font-black text-slate-900">{record.patientName}</div>
                          <div className="text-xs font-bold text-indigo-600 mt-0.5">{record.hn !== "N/A" ? `HN: ${record.hn}` : '-'}</div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded inline-block">
                            {record.referenceId}
                          </div>
                          <div className="text-[10px] font-black text-slate-400 mt-1 uppercase">
                            {record.category}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="text-xs font-bold text-slate-700">{record.hospitalDept}</div>
                          <div className="text-[10px] font-bold text-slate-400 mt-0.5">{record.date}</div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            onClick={() => deleteRecord(record.id)}
                            className="text-slate-300 hover:text-red-500 transition-all p-2"
                          >
                            <i className="fas fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-40">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <i className="fas fa-box-open text-3xl text-slate-200"></i>
                  </div>
                  <h3 className="text-base font-black text-slate-400 uppercase tracking-widest">No Data</h3>
                  <p className="text-sm text-slate-400 mt-2 font-medium">ยังไม่มีข้อมูลสแกนในระบบ</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
