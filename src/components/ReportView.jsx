import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { registerVietnameseFonts } from '../utils/pdfFonts';

import { API } from '../api';
const getToken = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) => fetch(url, {
  ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...opts.headers }
});

export default function ReportView({ vehicles }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [reportData, setReportData] = useState([]);
  const [generating, setGenerating] = useState(false);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await authFetch(`${API}/monthly-logs/generate`, {
        method: 'POST', body: JSON.stringify({ month, year })
      });
      const data = await res.json();
      setReportData(data);
    } catch (err) { console.error(err); }
    setGenerating(false);
  };

  const fetchExisting = async () => {
    try {
      const res = await fetch(`${API}/monthly-logs?month=${month}&year=${year}`);
      const data = await res.json();
      if (data.length > 0) setReportData(data);
      else setReportData([]);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchExisting(); }, [month, year]);

  const displayData = reportData.length > 0
    ? reportData.map((log, i) => ({
        id: i + 1,
        plate: log.vehicleId?.plate || '—',
        driver: log.driverId?.name || log.vehicleId?.driverId?.name || '—',
        startKm: log.startKm || 0,
        endKm: log.endKm || 0,
        totalKm: log.totalKm || 0,
        craneHours: log.craneHours || 0,
        note: log.note || ''
      }))
    : vehicles.map((v, i) => ({
        id: i + 1,
        plate: v.plate,
        driver: v.driverId?.name || '—',
        startKm: v.currentKm || 0,
        endKm: v.currentKm || 0,
        totalKm: 0,
        craneHours: 0,
        note: 'Chưa có dữ liệu hành trình'
      }));

  const generatePDF = async () => {
    try {
      const doc = new jsPDF('landscape');
      await registerVietnameseFonts(doc);
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(13);
      doc.text('CÔNG TY ĐIỆN LỰC HÀ TĨNH', 14, 18);
      doc.setFontSize(15);
      doc.text(`BIÊN BẢN GHI CHỈ SỐ CÔNG TƠ MÉT THÁNG ${month} NĂM ${year}`, 148, 28, null, null, 'center');

      const cols = ['TT', 'Biển KS', 'Lái xe', 'Chỉ số đầu', 'Chỉ số cuối', 'Tổng (km)', 'Giờ cẩu', 'Ghi chú'];
      const rows = displayData.map(d => [
        String(d.id || ''), String(d.plate || ''), String(d.driver || ''),
        String(d.startKm || '0'), String(d.endKm || '0'), String(d.totalKm || '0'),
        String(d.craneHours || '0'), String(d.note || '')
      ]);

      doc.autoTable({
        head: [cols], body: rows, startY: 36, theme: 'grid',
        headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 9, halign: 'center', valign: 'middle', font: 'Roboto', fontStyle: 'bold' },
        styles: { fontSize: 9, halign: 'center', cellPadding: 4, font: 'Roboto' },
        columnStyles: { 2: { halign: 'left' }, 7: { halign: 'left' } }
      });

      const fY = doc.lastAutoTable.finalY || 40;
      doc.setFontSize(11);
      doc.text('VĂN PHÒNG CÔNG TY', 70, fY + 18, null, null, 'center');
      doc.text('TỔ XE', 230, fY + 18, null, null, 'center');
      doc.setFontSize(9);
      doc.text('(Ký và ghi rõ họ tên)', 70, fY + 25, null, null, 'center');
      doc.text('(Ký và ghi rõ họ tên)', 230, fY + 25, null, null, 'center');

      doc.save(`Bao_cao_km_thang_${month}_${year}.pdf`);
    } catch (error) {
      console.error('PDF Error:', error);
      alert('Lỗi tạo PDF: ' + error.message);
    }
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Biên bản Chỉ số Công tơ mét</h1>
          <p>Tổng hợp dữ liệu hành trình theo tháng / quý / năm.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flex: '1', minWidth: 200 }}>
              <select className="form-input" value={month} onChange={e => setMonth(Number(e.target.value))} style={{ flex: 1 }}>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
              </select>
              <select className="form-input" value={year} onChange={e => setYear(Number(e.target.value))} style={{ flex: 1 }}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={generateReport} disabled={generating} style={{ opacity: generating ? 0.6 : 1 }}>
                <FileSpreadsheet size={16} /> {generating ? 'Đang...' : 'Tổng hợp dữ liệu'}
              </button>
              <button className="btn btn-secondary" onClick={generatePDF} style={{ color: 'var(--info)' }}>
                <Download size={16} /> Xuất PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h3>Biên bản tháng {month}/{year}</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>TT</th>
                  <th>Biển KS</th>
                  <th>Họ tên lái xe</th>
                  <th style={{ textAlign: 'right' }}>Chỉ số tháng trước</th>
                  <th style={{ textAlign: 'right' }}>Chỉ số tháng này</th>
                  <th style={{ textAlign: 'right' }}>Tổng số (km)</th>
                  <th style={{ textAlign: 'right' }}>Giờ cẩu</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {displayData.map((row) => (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center' }}>{row.id}</td>
                    <td style={{ fontWeight: 700 }}>{row.plate}</td>
                    <td>{row.driver}</td>
                    <td style={{ textAlign: 'right' }}>{row.startKm ? row.startKm.toLocaleString() : '0'}</td>
                    <td style={{ textAlign: 'right' }}>{row.endKm ? row.endKm.toLocaleString() : '0'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: row.totalKm > 0 ? 'var(--primary-600)' : 'var(--gray-400)' }}>
                      {row.totalKm ? row.totalKm.toLocaleString() : '0'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: row.craneHours ? 'var(--accent)' : 'var(--gray-400)' }}>
                      {row.craneHours ? `${row.craneHours} giờ` : ''}
                    </td>
                    <td className="text-dim text-sm">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Signature */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, padding: '0 40px' }}>
        <div style={{ textAlign: 'center' }}>
          <p className="font-bold">VĂN PHÒNG CÔNG TY</p>
          <p className="text-sm text-dim">(Ký và ghi rõ họ tên)</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p className="font-bold">TỔ XE</p>
          <p className="text-sm text-dim">(Ký và ghi rõ họ tên)</p>
        </div>
      </div>
    </div>
  );
}
