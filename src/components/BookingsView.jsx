import React, { useState, useEffect } from 'react';
import { Check, Download, Plus, Clock, UserCheck, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
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

const statusMap = {
  pending: { label: 'Chờ duyệt', badge: 'maintenance' },
  approved: { label: 'Đã duyệt', badge: 'available' },
  assigned: { label: 'Đã phân xe', badge: 'in-use' },
  ongoing: { label: 'Đang chạy', badge: 'in-use' },
  completed: { label: 'Hoàn thành', badge: 'available' }
};

export default function BookingsView({ vehicles, drivers, user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignModalId, setAssignModalId] = useState(null);
  const [assignForm, setAssignForm] = useState({ vehicleId: '', driverId: '' });
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    requestor: '', department: '', purpose: '', destination: '',
    startTime: '', endTime: '', duration: '', vehicleRequest: '', isAdhoc: false, weekLabel: ''
  });

  const fetchBookings = () => {
    const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
    fetch(`${API}/bookings${params}`).then(r => r.json()).then(data => { setBookings(data); setLoading(false); });
  };
  useEffect(() => { fetchBookings(); }, [filterStatus]);

  const handleApprove = (id) => authFetch(`${API}/bookings/${id}/approve`, { method: 'PUT' }).then(() => fetchBookings());

  const handleAssign = async (e) => {
    e.preventDefault();
    await authFetch(`${API}/bookings/${assignModalId}/assign`, { method: 'PUT', body: JSON.stringify(assignForm) });
    setAssignModalId(null);
    fetchBookings();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await authFetch(`${API}/bookings`, { method: 'POST', body: JSON.stringify(formData) });
    const newBooking = await res.json();
    if (res.ok) {
      setIsModalOpen(false);
      setFormData({ requestor: '', department: '', purpose: '', destination: '', startTime: '', endTime: '', duration: '', vehicleRequest: '', isAdhoc: false, weekLabel: '' });
      fetchBookings();
      // Automatically generate PDF for the new booking
      setTimeout(() => generatePDF(newBooking), 500);
    }
  };

  const generatePDF = async (b) => {
    try {
      const doc = new jsPDF();
      await registerVietnameseFonts(doc);
      doc.setFont('Roboto', 'normal');
      
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Page 1: LỆNH ĐIỀU XE
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(10);
      doc.text('CÔNG TY ĐIỆN LỰC HÀ TĨNH', 14, 20);
      doc.text('VĂN PHÒNG', 28, 26);
      doc.line(26, 28, 46, 28);
      doc.setFont('Roboto', 'normal');
      doc.text('Số: 562/VP', 28, 33);

      doc.setFont('Roboto', 'bold');
      doc.text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', pageWidth - 14, 20, null, null, 'right');
      doc.text('Độc lập – Tự do – Hạnh phúc', pageWidth - 14, 26, null, null, 'right');
      doc.line(pageWidth - 62, 28, pageWidth - 14, 28);
      
      doc.setFont('Roboto', 'italic');
      doc.setFontSize(10);
      doc.text(`Hà Tĩnh, ngày ${format(new Date(), 'dd')} tháng ${format(new Date(), 'MM')} năm ${format(new Date(), 'yyyy')}`, pageWidth - 14, 38, null, null, 'right');

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(15);
      doc.text('LỆNH ĐIỀU XE', pageWidth / 2, 55, null, null, 'center');

      doc.setFont('Roboto', 'italic');
      doc.setFontSize(11);
      doc.text('Kính gửi: Ông Phó Giám đốc Công ty', pageWidth / 2, 63, null, null, 'center');

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(11);
      let y = 75;
      const lineHeight = 8;
      
      const drawLabeledText = (label, value, targetY) => {
        doc.setFont('Roboto', 'bold');
        doc.text(label, 20, targetY);
        const labelWidth = doc.getTextWidth(label);
        doc.setFont('Roboto', 'normal');
        doc.text(`: ${value || '....................................................................'}`, 20 + labelWidth, targetY);
      };

      drawLabeledText('- Căn cứ', 'Lịch tuần của đội Hotline Công ty Điện lực Hà Tĩnh', y); y += lineHeight;
      drawLabeledText('- Đơn vị sử dụng xe', b.department || 'Đội Hotline', y); y += lineHeight;
      drawLabeledText('- Lý do sử dụng', b.purpose, y); y += lineHeight;
      drawLabeledText('- Tuyến đường xe chạy', b.destination, y); y += lineHeight;
      drawLabeledText('- Ngày giờ xuất phát', `${format(new Date(b.startTime), 'HH')}h${format(new Date(b.startTime), 'mm')} ngày ${format(new Date(b.startTime), 'dd/MM/yyyy')}`, y); y += lineHeight;
      drawLabeledText('- Kết thúc', `Trong ngày ${format(new Date(b.endTime), 'dd /MM /yyyy')}`, y); y += lineHeight;
      
      // Car Info Row
      doc.setFont('Roboto', 'bold');
      doc.text('- Xe', 20, y);
      doc.setFont('Roboto', 'normal');
      doc.text(`: ${b.vehicleId?.model || 'Ô tô gắn gầu nâng'}`, 20 + doc.getTextWidth('- Xe'), y);
      
      doc.setFont('Roboto', 'bold');
      doc.text('BKS', 105, y);
      doc.setFont('Roboto', 'normal');
      doc.text(`: ${b.vehicleId?.plate || '...........'}`, 105 + doc.getTextWidth('BKS'), y); 
      y += lineHeight;
      
      // Driver Info Row
      doc.setFont('Roboto', 'bold');
      doc.text('- Lái xe', 20, y);
      doc.setFont('Roboto', 'normal');
      doc.text(`: ${b.driverId?.name || b.vehicleId?.driverId?.name || '...........'}`, 20 + doc.getTextWidth('- Lái xe'), y);
      
      doc.setFont('Roboto', 'bold');
      doc.text('Số người theo xe', 105, y);
      doc.setFont('Roboto', 'normal');
      doc.text(`: ${b.participants || '2'}`, 105 + doc.getTextWidth('Số người theo xe'), y);
      y += lineHeight;
      
      drawLabeledText('- Lệnh điều xe trong ngày', 'Lần 1', y); y += lineHeight;
      drawLabeledText('- Số km dự kiến', `${b.duration || '70 km và 6 h cẩu ./.'}`, y); y += lineHeight;

      // Footer
      doc.setFont('Roboto', 'bold');
      doc.text('Nơi nhận:', 16, y + 10);
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(10);
      doc.text('- Như trên;', 16, y + 15);
      doc.text('- Lưu: VT.', 16, y + 20);

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(11);
      doc.text('PHÓ CHÁNH VĂN PHÒNG', pageWidth - 60, y + 10, null, null, 'center');
      
      doc.setFont('Roboto', 'italic');
      doc.text('(Ky, ghi ro ho ten)', pageWidth - 60, y + 16, null, null, 'center');

      doc.setFont('Roboto', 'normal');
      doc.text('Trịnh Quỳnh Trâm', pageWidth - 60, y + 45, null, null, 'center');
      
      doc.setFont('Roboto', 'bold');
      doc.text('Ý kiến phê duyệt của PGĐ Phạm Việt Thắng', pageWidth / 2, y + 60, null, null, 'center');
      doc.setFont('Roboto', 'normal');
      doc.text('Đồng ý', 16, y + 70);

      // Page 2: NHẬT TRÌNH XE
      doc.addPage();
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(16);
      doc.text('NHẬT TRÌNH XE', pageWidth / 2, 30, null, null, 'center');
      doc.setFontSize(11);
      doc.setFont('Roboto', 'normal');
      doc.text(`Kèm theo lệnh điều xe số ......... ngày...... tháng .... năm ${format(new Date(), 'yyyy')}`, pageWidth / 2, 40, null, null, 'center');

      y = 55;
      doc.setFont('Roboto', 'bold');
      doc.text('1. Đơn vị sử dụng xe: ', 20, y);
      doc.setFont('Roboto', 'normal');
      doc.text(b.department || '', 20 + doc.getTextWidth('1. Đơn vị sử dụng xe: '), y); y += lineHeight;
      
      doc.setFont('Roboto', 'bold');
      doc.text('2. Lái xe: ', 20, y);
      doc.setFont('Roboto', 'normal');
      doc.text(b.driverId?.name || b.vehicleId?.driverId?.name || '', 20 + doc.getTextWidth('2. Lái xe: '), y); y += lineHeight;
      
      doc.setFont('Roboto', 'bold');
      doc.text('3. Lộ trình xe chạy: ', 20, y);
      doc.setFont('Roboto', 'normal');
      doc.text(b.destination || '', 20 + doc.getTextWidth('3. Lộ trình xe chạy: '), y); y += lineHeight;

      autoTable(doc, {
        startY: y + 5,
        head: [[
          'Giờ/\nngày\nxuất\nphát', 
          'Địa điểm xuất phát', 
          'Địa điểm đến', 
          'Số Km\nxe\nchạy', 
          'Chi phí\ngửi xe (đ)'
        ]],
        body: [['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']],
        theme: 'grid',
        headStyles: { 
          fillColor: [255, 255, 255], 
          textColor: [0, 0, 0], 
          lineWidth: 0.1, 
          halign: 'center', 
          fontSize: 10,
          font: 'Roboto',
          fontStyle: 'bold'
        },
        styles: { 
          font: 'Roboto', 
          fontSize: 10, 
          cellPadding: 4, 
          minCellHeight: 20,
          halign: 'center',
          valign: 'middle'
        },
        foot: [[{ content: 'Tổng km Lịch trình xe chạy', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } }, '', '']],
        footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1 }
      });

      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFont('Roboto', 'bold');
      doc.text('Xác nhận của Đơn vị sử dụng xe', 55, finalY, null, null, 'center');
      doc.text('Lái xe', pageWidth - 55, finalY, null, null, 'center');
      
      doc.text('Xác nhận của Chánh văn phòng', pageWidth / 2, finalY + 40, null, null, 'center');

      const filename = `Lenh_Dieu_Xe_${b.vehicleId?.plate || 'draft'}.pdf`;
      doc.save(filename);

      // Upload logic
      const pdfBlob = doc.output('blob');
      const uploadForm = new FormData();
      uploadForm.append('file', pdfBlob, filename);
      fetch(`${API}/upload`, { method: 'POST', body: uploadForm })
        .then(res => res.json())
        .then(data => {
          if (data.url && b._id) {
            authFetch(`${API}/bookings/${b._id}`, { method: 'PUT', body: JSON.stringify({ pdfUrl: data.url }) })
              .then(() => fetchBookings());
          }
        })
        .catch(console.error);
    } catch (err) {
      console.error('PDF Error:', err);
      alert('Không thể tạo PDF: ' + err.message);
    }
  };

  const inputStyle = { width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', fontSize: '0.9rem' };
  const labelStyle = { display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', fontWeight: 500 };
  const canApprove = user?.role === 'cvp' || user?.role === 'admin';
  const canAssign = user?.role === 'team-lead' || user?.role === 'admin';

  return (
    <div className="page-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '0 16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Lệnh Điều Xe</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '4px', fontSize: '0.85rem' }}>Tạo, duyệt, phân công và theo dõi lệnh điều xe.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={20} /> Tạo lệnh mới</button>
      </header>

      {/* Status Filters */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[{ v: 'all', l: 'Tất cả' }, { v: 'pending', l: 'Chờ duyệt' }, { v: 'approved', l: 'Đã duyệt' }, { v: 'assigned', l: 'Đã phân xe' }, { v: 'ongoing', l: 'Đang chạy' }, { v: 'completed', l: 'Hoàn thành' }].map(f => (
          <button key={f.v} onClick={() => setFilterStatus(f.v)} style={{
            padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)',
            background: filterStatus === f.v ? 'rgba(16,185,129,0.15)' : 'transparent',
            color: filterStatus === f.v ? 'var(--primary)' : 'var(--text-dim)',
            cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
          }}>{f.l}</button>
        ))}
      </div>

      {/* List / Table */}
      <div className="glass" style={{ margin: '0 16px', padding: '20px', overflowX: 'auto' }}>
        {/* Desktop Table View */}
        <div className="hidden-mobile">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 8px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>NGƯỜI YÊU CẦU</th>
                <th style={{ padding: '10px 8px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>LỘ TRÌNH</th>
                <th style={{ padding: '10px 8px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>XE / TÀI XẾ</th>
                <th style={{ padding: '10px 8px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>TRẠNG THÁI</th>
                <th style={{ padding: '10px 8px', color: 'var(--text-dim)', fontSize: '0.75rem', textAlign: 'right' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>Đang tải...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>Không có lệnh nào.</td></tr>
              ) : (
                bookings.map(b => (
                  <tr key={b._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 8px' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{b.requestor}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {b.purpose}
                        {b.isAdhoc && <span style={{ color: 'var(--accent)', marginLeft: '4px', fontWeight: 600 }}>(Phát sinh)</span>}
                      </p>
                      {b.department && <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{b.department}</p>}
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.destination}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '3px' }}>
                        <Clock size={11} />
                        {format(new Date(b.startTime), 'dd/MM HH:mm')} → {format(new Date(b.endTime), 'dd/MM HH:mm')}
                        {b.duration && <span style={{ marginLeft: '4px' }}>({b.duration})</span>}
                      </div>
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      {b.vehicleId ? (
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.vehicleId.plate}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{b.driverId?.name || b.vehicleId.driverId?.name || '—'}</p>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{b.vehicleRequest || 'Chưa xếp xe'}</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      <span className={`badge badge-${statusMap[b.status]?.badge || 'maintenance'}`}>
                        {statusMap[b.status]?.label || b.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {b.status === 'pending' && canApprove && (
                          <button onClick={() => handleApprove(b._id)} title="Duyệt lệnh"
                            style={{ padding: '7px', borderRadius: '8px', background: 'rgba(16,185,129,0.2)', color: '#10b981', border: 'none', cursor: 'pointer' }}>
                            <Check size={15} />
                          </button>
                        )}
                        {b.status === 'approved' && canAssign && (
                          <button onClick={() => { setAssignModalId(b._id); setAssignForm({ vehicleId: '', driverId: '' }); }} title="Phân công xe"
                            style={{ padding: '7px', borderRadius: '8px', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: 'none', cursor: 'pointer' }}>
                            <UserCheck size={15} />
                          </button>
                        )}
                        {['assigned', 'ongoing', 'completed'].includes(b.status) && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {b.pdfUrl && (
                              <a href={b.pdfUrl} target="_blank" rel="noreferrer" title="Xem PDF trên Cloud"
                                style={{ padding: '7px', borderRadius: '8px', background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', display: 'flex', alignItems: 'center' }}>
                                <Download size={15} />
                              </a>
                            )}
                            <button onClick={() => generatePDF(b)} title="Tạo & Tải lệnh PDF"
                              style={{ padding: '7px', borderRadius: '8px', background: 'rgba(59,130,246,0.2)', color: '#3b82f6', border: 'none', cursor: 'pointer' }}>
                              <Check size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="show-mobile mobile-card-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>Đang tải...</p>
          ) : bookings.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>Không có lệnh nào.</p>
          ) : (
            bookings.map(b => (
              <div key={b._id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'white' }}>{b.destination}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{b.requestor} {b.department && `(${b.department})`}</span>
                  </div>
                  <span className={`badge badge-${statusMap[b.status]?.badge || 'maintenance'}`} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                    {statusMap[b.status]?.label || b.status}
                  </span>
                </div>

                <div style={{ padding: '10px 0', borderTop: '1px dashed rgba(255,255,255,0.1)', borderBottom: '1px dashed rgba(255,255,255,0.1)', margin: '8px 0', fontSize: '0.85rem' }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                    <Clock size={13} color="var(--primary)"/> {format(new Date(b.startTime), 'dd/MM HH:mm')} → {format(new Date(b.endTime), 'dd/MM HH:mm')}
                  </p>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)' }}>
                    <UserCheck size={13} color="var(--secondary)" /> {b.vehicleId ? `${b.vehicleId.plate} (${b.driverId?.name || b.vehicleId.driverId?.name || '---'})` : b.vehicleRequest || 'Chưa xếp xe'}
                  </p>
                  <p style={{ color: 'var(--text-dim)', marginTop: '4px' }}>
                    Mục đích: {b.purpose} {b.isAdhoc && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>(Phát sinh)</span>}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                  {b.status === 'pending' && canApprove && (
                    <button onClick={() => handleApprove(b._id)} className="btn"
                      style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.2)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', border: 'none' }}>
                      <Check size={15} /> Duyệt
                    </button>
                  )}
                  {b.status === 'approved' && canAssign && (
                    <button onClick={() => { setAssignModalId(b._id); setAssignForm({ vehicleId: '', driverId: '' }); }} className="btn"
                      style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', border: 'none' }}>
                      <UserCheck size={15} /> Phân công
                    </button>
                  )}
                  {['assigned', 'ongoing', 'completed'].includes(b.status) && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {b.pdfUrl && (
                        <a href={b.pdfUrl} target="_blank" rel="noreferrer" title="Xem PDF"
                          style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Download size={15} /> PDF
                        </a>
                      )}
                      <button onClick={() => generatePDF(b)} className="btn"
                        style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(59,130,246,0.2)', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px', border: 'none' }}>
                        <Download size={15} /> Tạo PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass" style={{ width: '100%', maxWidth: '550px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Tạo Lệnh Điều Xe</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div><label style={labelStyle}>Người / Đơn vị yêu cầu *</label><input required style={inputStyle} value={formData.requestor} onChange={e => setFormData({...formData, requestor: e.target.value})} /></div>
                <div><label style={labelStyle}>Phòng ban</label><input style={inputStyle} value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="P4, P11, BGĐ..." /></div>
              </div>
              <div><label style={labelStyle}>Nơi đến *</label><input required style={inputStyle} value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} /></div>
              <div><label style={labelStyle}>Nội dung / Mục đích *</label><input required style={inputStyle} value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div><label style={labelStyle}>Thời gian đi *</label><input required type="datetime-local" style={inputStyle} value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} /></div>
                <div><label style={labelStyle}>Thời gian về *</label><input required type="datetime-local" style={inputStyle} value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div><label style={labelStyle}>Thời lượng</label><input style={inputStyle} value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="1 Ngày, 0.5 Ngày..." /></div>
                <div><label style={labelStyle}>Yêu cầu xe</label><input style={inputStyle} value={formData.vehicleRequest} onChange={e => setFormData({...formData, vehicleRequest: e.target.value})} placeholder="4 chỗ, 16 chỗ, BKS..." /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="adhoc" checked={formData.isAdhoc} onChange={e => setFormData({...formData, isAdhoc: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                <label htmlFor="adhoc" style={{ fontSize: '0.9rem' }}>Lịch phát sinh (Bổ sung)</label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-dim)', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>Lưu lệnh</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModalId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass" style={{ width: '100%', maxWidth: '420px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Phân công Xe & Tài xế</h2>
              <button onClick={() => setAssignModalId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Chọn xe *</label>
                <select required style={inputStyle} value={assignForm.vehicleId} onChange={e => setAssignForm({...assignForm, vehicleId: e.target.value})}>
                  <option value="">-- Chọn xe --</option>
                  {vehicles.filter(v => v.status === 'available').map(v => (
                    <option key={v._id} value={v._id}>{v.plate} — {v.model} ({v.type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Chọn tài xế *</label>
                <select required style={inputStyle} value={assignForm.driverId} onChange={e => setAssignForm({...assignForm, driverId: e.target.value})}>
                  <option value="">-- Chọn tài xế --</option>
                  {(drivers || []).map(d => (
                    <option key={d._id} value={d._id}>{d.name} ({d.phone})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setAssignModalId(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-dim)', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>Phân công</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
