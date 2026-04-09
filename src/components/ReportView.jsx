import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { registerVietnameseFonts } from '../utils/pdfFonts';

const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) => fetch(url, {
  ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...opts.headers }
});

const removeAccents = (str) => {
  if (!str) return '';
  return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D');
};

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
      doc.text('CÔNG TY CỔ PHẦN C', 14, 18);
      
      doc.setFontSize(15);
      doc.text(`BIÊN BẢN GHI CHỈ SỐ CÔNG TƠ MÉT THÁNG ${month} NĂM ${year}`, 148, 28, null, null, 'center');

      const cols = ['TT', 'Biển KS', 'Lái xe', 'Chỉ số đầu', 'Chỉ số cuối', 'Tổng (km)', 'Giờ cẩu', 'Ghi chú'];
      const rows = displayData.map(d => [
        d.id, 
        d.plate, 
        d.driver,
        d.startKm ? d.startKm.toLocaleString() : '0',
        d.endKm ? d.endKm.toLocaleString() : '0',
        d.totalKm ? d.totalKm.toLocaleString() : '0',
        d.craneHours ? d.craneHours + 'h' : '',
        d.note
      ]);

      autoTable(doc, {
        head: [cols], 
        body: rows, 
        startY: 36,
        theme: 'grid',
        headStyles: { 
          fillColor: [16, 185, 129], 
          textColor: 255, 
          fontSize: 9, 
          halign: 'center', 
          valign: 'middle',
          font: 'Roboto',
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 9, 
          halign: 'center', 
          cellPadding: 4, 
          font: 'Roboto' 
        },
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

  const selectStyle = {
    padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
    borderRadius: '8px', color: 'white', fontSize: '0.9rem', cursor: 'pointer'
  };

  return (
    <div className="page-container">
      <header style={{ marginBottom: '32px', padding: '0 16px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Biên bản Chỉ số Công tơ mét</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '4px', fontSize: '0.85rem' }}>Tổng hợp dữ liệu hành trình theo tháng / quý / năm.</p>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.03)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '200px' }}>
            <select style={{ ...selectStyle, flex: 1 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
            </select>
            <select style={{ ...selectStyle, flex: 1 }} value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', flex: '2', minWidth: '280px' }}>
            <button className="btn btn-primary" onClick={generateReport} disabled={generating} style={{ flex: 1, opacity: generating ? 0.6 : 1, justifyContent: 'center', fontSize: '0.85rem' }}>
              <FileSpreadsheet size={18} /> {generating ? 'Đang...' : 'Tổng hợp dữ liệu'}
            </button>
            <button className="btn" onClick={generatePDF} style={{ flex: 1, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', justifyContent: 'center', fontSize: '0.85rem' }}>
              <Download size={18} /> Xuất PDF
            </button>
          </div>
        </div>
      </header>

      <div className="glass" style={{ margin: '0 16px', padding: '20px', overflowX: 'auto' }}>
        <div className="hidden-mobile" style={{ width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                {['TT', 'Biển KS', 'Họ tên lái xe', 'Chỉ số tháng trước', 'Chỉ số tháng này', 'Tổng số (km)', 'Tổng số giờ cẩu', 'Ghi chú'].map((h, i) => (
                  <th key={i} style={{ padding: '12px 8px', border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, i) => (
                <tr key={i} style={{ textAlign: 'center' }}>
                  <td style={{ padding: '10px 8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>{row.id}</td>
                  <td style={{ padding: '10px 8px', border: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem' }}>{row.plate}</td>
                  <td style={{ padding: '10px 8px', border: '1px solid var(--border)', textAlign: 'left', fontSize: '0.85rem' }}>{row.driver}</td>
                  <td style={{ padding: '10px 8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>{row.startKm ? row.startKm.toLocaleString() : '0'}</td>
                  <td style={{ padding: '10px 8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>{row.endKm ? row.endKm.toLocaleString() : '0'}</td>
                  <td style={{ padding: '10px 8px', border: '1px solid var(--border)', fontWeight: 700, color: row.totalKm > 0 ? 'var(--primary)' : 'var(--text-dim)', fontSize: '0.85rem' }}>
                    {row.totalKm ? row.totalKm.toLocaleString() : '0'}
                  </td>
                  <td style={{ padding: '10px 8px', border: '1px solid var(--border)', fontWeight: 600, color: row.craneHours ? 'var(--accent)' : 'var(--text-dim)', fontSize: '0.85rem' }}>
                    {row.craneHours ? `${row.craneHours} giờ` : ''}
                  </td>
                  <td style={{ padding: '10px 8px', border: '1px solid var(--border)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="show-mobile mobile-card-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          {displayData.map((row) => (
            <div key={row.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '10px' }}>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>{row.plate}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{row.driver}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Tổng số (km)</p>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem', color: row.totalKm > 0 ? 'var(--primary)' : 'var(--text-dim)' }}>
                    {row.totalKm ? row.totalKm.toLocaleString() : '0'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                <div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Chỉ số đầu</p>
                  <p style={{ fontWeight: 600 }}>{row.startKm ? row.startKm.toLocaleString() : '0'}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Chỉ số cuối</p>
                  <p style={{ fontWeight: 600 }}>{row.endKm ? row.endKm.toLocaleString() : '0'}</p>
                </div>
              </div>
              {row.craneHours > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Giờ cẩu:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>{row.craneHours}h</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', padding: '0 40px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 600 }}>VAN PHONG CONG TY</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>(Ky va ghi ro ho ten)</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 600 }}>TO XE</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>(Ky va ghi ro ho ten)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
