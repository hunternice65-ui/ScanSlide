
import React, { useState, useRef } from 'react';
import { extractMultipleDataFromImage } from './services/geminiService';
import { exportToExcel } from './services/excelService';
import { ScanRecord } from './types';

const App: React.FC = () => {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

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
    
    const newRecordsList: ScanRecord[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const base64 = await readFileAsBase64(files[i]);
        setCurrentFile(base64);
        
        const results = await extractMultipleDataFromImage(base64);
        
        results.forEach(data => {
          newRecordsList.push({
            ...data,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleString('th-TH'),
            thumbnail: base64
          });
        });
      } catch (err: any) {
        setError("การประมวลผลขัดข้อง: " + err.message);
      }
    }

    setRecords(prev => [...newRecordsList, ...prev]);
    setIsProcessing(false);
    setCurrentFile(null);
  };

  const deleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Bar */}
      <header className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center border border-blue-400">
            <i className="fas fa-microchip animate-pulse"></i>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">INTELLISCAN CORE</h1>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Vision Logic Engine v4.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] font-black text-slate-500 uppercase">Engine Status</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              ONLINE / READY
            </span>
          </div>
          <button 
            onClick={() => exportToExcel(records)}
            disabled={records.length === 0 || isProcessing}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 px-6 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg flex items-center gap-2"
          >
            <i className="fas fa-file-excel"></i>
            ส่งออก EXCEL ({records.length})
          </button>
        </div>
      </header>

      <main className="flex-grow p-6 lg:p-10 flex flex-col lg:flex-row gap-10 max-w-[1600px] mx-auto w-full">
        {/* Sidebar: Controls */}
        <aside className="w-full lg:w-96 space-y-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Input Source</h2>
            
            <div 
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all relative overflow-hidden group ${
                isProcessing ? 'bg-slate-50 border-slate-200 cursor-not-allowed' : 'border-blue-200 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer'
              }`}
            >
              {currentFile ? (
                <img src={currentFile} className={`w-full h-full object-cover transition-opacity ${isProcessing ? 'opacity-50' : 'opacity-100'}`} />
              ) : (
                <>
                  <i className="fas fa-cloud-upload text-3xl text-blue-300 mb-3 group-hover:scale-110 transition-transform"></i>
                  <span className="text-xs font-black text-slate-600">คลิกเพื่อเพิ่มภาพสแกน</span>
                </>
              )}
              
              {isProcessing && (
                <div className="absolute inset-0 bg-blue-600/10 flex flex-col items-center justify-center backdrop-blur-sm">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-3"></div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest bg-blue-600 px-3 py-1 rounded-full">กำลังประมวลผล...</span>
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => e.target.files && processFiles(e.target.files)} 
                className="hidden" 
                accept="image/*" 
                multiple 
              />
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-[11px] font-bold text-red-600 flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                <i className="fas fa-exclamation-triangle mt-0.5"></i>
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-900/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Info</h3>
              <i className="fas fa-shield-check text-blue-500"></i>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] text-slate-500">Language Path</span>
                <span className="text-[11px] font-bold">THA + ENG (UTF-8)</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] text-slate-500">Recognition Type</span>
                <span className="text-[11px] font-bold">Multi-Label Neural</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-slate-500">Engine Version</span>
                <span className="text-[11px] font-bold">4.0.1 (Premium)</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content: Table */}
        <section className="flex-grow">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">รายการที่ตรวจพบ</h2>
                <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">แสดงข้อมูลที่สกัดได้จากป้ายสติกเกอร์</p>
              </div>
              <div className="bg-slate-100 px-4 py-2 rounded-2xl">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Total Records: {records.length}</span>
              </div>
            </div>

            <div className="flex-grow overflow-x-auto">
              {records.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                      <th className="px-10 py-5">Image</th>
                      <th className="px-10 py-5">Name / HN</th>
                      <th className="px-10 py-5">Ref ID / Dept</th>
                      <th className="px-10 py-5">Category / Date</th>
                      <th className="px-10 py-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {records.map((record, idx) => (
                      <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-10 py-5">
                          <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white shadow-md group-hover:scale-105 transition-transform">
                            <img src={record.thumbnail} className="w-full h-full object-cover" />
                          </div>
                        </td>
                        <td className="px-10 py-5">
                          <div className="text-sm font-black text-slate-800">{record.patientName}</div>
                          <div className="text-[10px] font-bold text-blue-600 mt-1 uppercase bg-blue-50 inline-block px-2 py-0.5 rounded-md">
                            {record.hn !== 'N/A' ? `HN: ${record.hn}` : '-'}
                          </div>
                        </td>
                        <td className="px-10 py-5">
                          <div className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block">
                            {record.referenceId}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{record.hospitalDept}</div>
                        </td>
                        <td className="px-10 py-5">
                          <div className="text-[11px] font-black text-slate-900 uppercase">{record.category}</div>
                          <div className="text-[10px] font-bold text-slate-400 mt-1">{record.date}</div>
                        </td>
                        <td className="px-10 py-5 text-right">
                          <button 
                            onClick={() => deleteRecord(record.id)}
                            className="w-10 h-10 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all flex items-center justify-center mx-auto"
                          >
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-40 flex flex-col items-center justify-center text-slate-300">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100">
                    <i className="fas fa-expand text-4xl"></i>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.4em] mb-2">Ready for Scanning</h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">กรุณาอัปโหลดรูปภาพเพื่อเริ่มต้นกระบวนการ</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 px-10 bg-white border-t border-slate-200 flex justify-between items-center">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">© 2025 Intelliscan Pro • Advanced Vision Module</span>
        <div className="flex gap-4">
          <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            Cloud Sync Active
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
