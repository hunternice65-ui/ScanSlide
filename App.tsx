
import React, { useState, useRef } from 'react';
import { extractMultipleDataFromImage } from './services/geminiService';
import { exportToExcel } from './services/excelService';
import { ScanRecord } from './types';

const App: React.FC = () => {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, labelsFound: 0 });
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
    setProgress({ current: 0, total: files.length, labelsFound: 0 });
    
    const newRecordsList: ScanRecord[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(prev => ({ ...prev, current: i + 1 }));
      
      try {
        const base64 = await readFileAsBase64(file);
        setPreviewImage(base64); 
        
        // วิเคราะห์ภาพด้วยระบบ Intelligent Recognition
        const extractedResults = await extractMultipleDataFromImage(base64);
        
        setProgress(prev => ({ ...prev, labelsFound: prev.labelsFound + extractedResults.length }));

        extractedResults.forEach(data => {
          newRecordsList.push({
            ...data,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleString('th-TH'),
            thumbnail: base64
          });
        });
      } catch (err: any) {
        console.error(`Error processing file ${file.name}:`, err);
        setError(`ไม่สามารถอ่านข้อมูลจาก ${file.name} ได้: ${err.message}`);
      }
    }

    setRecords(prev => [...newRecordsList, ...prev]);
    setIsProcessing(false);
    
    setTimeout(() => {
      setProgress(p => ({ ...p, labelsFound: 0 }));
    }, 5000);
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-indigo-200 shadow-lg">
              <i className="fas fa-camera-viewfinder text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">VisionScan Pro</h1>
              <p className="text-[10px] uppercase tracking-widest text-indigo-500 font-bold">Auto Label Recognition</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {records.length > 0 && (
              <button 
                onClick={clearAll}
                className="text-slate-400 hover:text-red-500 p-2 text-sm transition-colors"
                title="ล้างทั้งหมด"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            )}
            <button 
              onClick={() => exportToExcel(records)}
              disabled={records.length === 0 || isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-md shadow-emerald-100 font-medium text-sm"
            >
              <i className="fas fa-file-excel"></i>
              <span>ส่งออก Excel {records.length > 0 ? `(${records.length})` : ''}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-4 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Column */}
        <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <i className="fas fa-plus-circle text-indigo-500"></i>
              สแกนแผ่นป้าย
            </h2>
            
            <div 
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all group ${
                isProcessing 
                ? 'border-slate-200 bg-slate-50 cursor-not-allowed' 
                : 'border-slate-300 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50'
              }`}
            >
              <div className={`p-4 rounded-full mb-4 transition-transform ${isProcessing ? 'bg-slate-200 text-slate-400' : 'bg-indigo-50 text-indigo-600 group-hover:scale-110'}`}>
                <i className={`fas ${isProcessing ? 'fa-circle-notch fa-spin' : 'fa-camera'} text-3xl`}></i>
              </div>
              <p className="text-sm font-semibold text-slate-700 text-center">
                {isProcessing ? `กำลังประมวลผล...` : 'เลือกรูปภาพแผ่นป้าย'}
              </p>
              <p className="text-xs text-slate-400 mt-2 text-center">รองรับการสแกนหลายแผ่นพร้อมกัน</p>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
                multiple
              />
            </div>

            {isProcessing && (
              <div className="mt-6">
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                  <span>ไฟล์ที่ {progress.current}/{progress.total}</span>
                  <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-start gap-2">
                <i className="fas fa-circle-info mt-0.5"></i>
                <span>{error}</span>
              </div>
            )}

            {previewImage && (
              <div className="mt-8">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">ภาพล่าสุดที่สแกน</p>
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm h-48">
                  {isProcessing && <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-[1px] z-10 animate-pulse"></div>}
                  <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-3xl p-6 text-white shadow-lg shadow-slate-200">
            <h3 className="font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <i className="fas fa-shield-halved text-emerald-400"></i>
              System Core
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              ระบบสแกนอัตโนมัติที่ช่วยแยกข้อมูลภาษาไทยจากสติกเกอร์พื้นขาวได้อย่างแม่นยำและรวดเร็ว
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-grow flex flex-col">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <i className="fas fa-list-ul"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">ข้อมูลที่ตรวจพบ</h2>
                  <p className="text-xs text-slate-400">ทั้งหมด {records.length} รายการ</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {records.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-center">แผ่น</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">ชื่อ-นามสกุล / HN</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">รหัสอ้างอิง / ประเภท</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">หน่วยงาน / วันที่</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-right">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="inline-block relative h-10 w-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                            <img src={record.thumbnail} className="h-full w-full object-cover" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-800">{record.patientName}</div>
                          <div className="text-xs text-indigo-500 font-semibold">{record.hn !== "N/A" ? `HN: ${record.hn}` : "-"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 inline-block mb-1">
                            {record.referenceId}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                            {record.category}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-bold text-slate-700">{record.hospitalDept}</div>
                          <div className="text-[10px] text-slate-400">{record.date}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => deleteRecord(record.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <i className="fas fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <i className="fas fa-id-card text-3xl"></i>
                  </div>
                  <h3 className="text-lg font-bold text-slate-400">ไม่มีข้อมูล</h3>
                  <p className="max-w-xs text-center text-sm mt-2 text-slate-400">
                    อัปโหลดภาพถ่ายแผ่นป้ายสติกเกอร์เพื่อเริ่มต้นสกัดข้อมูล
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <div className="flex items-center gap-4">
            <span>Vision Processor v3.0</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>Multi-label Architecture</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-500">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            <span>System Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
