import { useState, useEffect } from 'react';
import { Check, Download, Plus, Clock, UserCheck, X } from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { registerVietnameseFonts } from '../utils/pdfFonts';
import { API } from '../api';

const getToken = () => localStorage.getItem('token');
const authFetch = (url, opts = {}) => fetch(url, {
  ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...opts.headers }
});

const statusMap = {
  pending: { label: 'Chờ duyệt', badge: 'badge-warning' },
  approved: { label: 'Đã duyệt', badge: 'badge-success' },
  assigned: { label: 'Đã phân xe', badge: 'badge-info' },
  ongoing: { label: 'Đang chạy', badge: 'badge-info' },
  completed: { label: 'Hoàn thành', badge: 'badge-success' }
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
      doc.text('CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM', pageWidth - 14, 20, null, null, 'right');
      doc.text('Độc lập - Tự do - Hạnh phúc', pageWidth - 14, 26, null, null, 'right');
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
      drawLabeledText('- Kết thúc', `Trong ngày ${format(new Date(b.endTime), 'dd/MM/yyyy')}`, y); y += lineHeight;

      doc.setFont('Roboto', 'bold');
      doc.text('- Xe', 20, y);
      doc.setFont('Roboto', 'normal');
      doc.text(`: ${b.vehicleId?.model || 'Ô tô'}`, 20 + doc.getTextWidth('- Xe'), y);
      doc.setFont('Roboto', 'bold');
      doc.text('BKS', 105, y);
      doc.setFont('Roboto', 'normal');
      doc.text(`: ${b.vehicleId?.plate || '...........'}`, 105 + doc.getTextWidth('BKS'), y);
      y += lineHeight;

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
      drawLabeledText('- Số km dự kiến', `${b.duration || '...'}`, y); y += lineHeight;

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
      doc.text('(Ký, ghi rõ họ tên)', pageWidth - 60, y + 16, null, null, 'center');

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

      doc.autoTable({
        startY: y + 5,
        head: [['Giờ/\nngày\nxuất\nphát', 'Địa điểm xuất phát', 'Địa điểm đến', 'Số Km\nxe\nchạy', 'Chi phí\ngửi xe (đ)']],
        body: [['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']],
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, halign: 'center', fontSize: 10, font: 'Roboto', fontStyle: 'bold' },
        styles: { font: 'Roboto', fontSize: 10, cellPadding: 4, minCellHeight: 20, halign: 'center', valign: 'middle' },
        foot: [[{ content: 'Tổng km Lịch trình xe chạy', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } }, { content: '', colSpan: 1 }, { content: '', colSpan: 1 }]],
        footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1 }
      });

      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFont('Roboto', 'bold');
      doc.text('Xác nhận của Đơn vị sử dụng xe', 55, finalY, null, null, 'center');
      doc.text('Lái xe', pageWidth - 55, finalY, null, null, 'center');
      doc.text('Xác nhận của Chánh văn phòng', pageWidth / 2, finalY + 40, null, null, 'center');

      const filename = `Lenh_Dieu_Xe_${b.vehicleId?.plate || 'draft'}.pdf`;
      doc.save(filename);

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

  const canApprove = user?.role === 'cvp' || user?.role === 'admin';
  const canAssign = user?.role === 'team-lead' || user?.role === 'admin';

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Lệnh Điều Xe</h1>
          <p>Tạo, duyệt, phân công và theo dõi lệnh điều xe.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={18} /> Tạo lệnh mới</button>
      </div>

      {/* Status Filters */}
      <div className="filter-bar">
        <div className="filter-tabs">
          {[{ v: 'all', l: 'Tất cả' }, { v: 'pending', l: 'Chờ duyệt' }, { v: 'approved', l: 'Đã duyệt' }, { v: 'assigned', l: 'Đã phân xe' }, { v: 'ongoing', l: 'Đang chạy' }, { v: 'completed', l: 'Hoàn thành' }].map(f => (
            <button key={f.v} className={`filter-tab ${filterStatus === f.v ? 'active' : ''}`} onClick={() => setFilterStatus(f.v)}>{f.l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Người yêu cầu</th>
                  <th>Lộ trình</th>
                  <th>Xe / Tài xế</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="empty-state"><p>Đang tải...</p></td></tr>
                ) : bookings.length === 0 ? (
                  <tr><td colSpan="5" className="empty-state"><p>Không có lệnh nào.</p></td></tr>
                ) : (
                  bookings.map(b => (
                    <tr key={b._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.requestor}</div>
                        <div className="text-xs text-dim">
                          {b.purpose}
                          {b.isAdhoc && <span style={{ color: 'var(--accent)', marginLeft: 4, fontWeight: 600 }}>(Phát sinh)</span>}
                        </div>
                        {b.department && <div className="text-xs text-dim">{b.department}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.destination}</div>
                        <div className="text-xs text-dim" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Clock size={11} />
                          {format(new Date(b.startTime), 'dd/MM HH:mm')} → {format(new Date(b.endTime), 'dd/MM HH:mm')}
                          {b.duration && <span>({b.duration})</span>}
                        </div>
                      </td>
                      <td>
                        {b.vehicleId ? (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.vehicleId.plate}</div>
                            <div className="text-xs text-dim">{b.driverId?.name || b.vehicleId.driverId?.name || '—'}</div>
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--accent)' }}>{b.vehicleRequest || 'Chưa xếp xe'}</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${statusMap[b.status]?.badge || 'badge-warning'}`}>
                          <span className="badge-dot" />
                          {statusMap[b.status]?.label || b.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {b.status === 'pending' && canApprove && (
                            <button onClick={() => handleApprove(b._id)} title="Duyệt lệnh" className="btn btn-icon btn-sm" style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', border: '1px solid var(--primary-100)' }}>
                              <Check size={15} />
                            </button>
                          )}
                          {b.status === 'approved' && canAssign && (
                            <button onClick={() => { setAssignModalId(b._id); setAssignForm({ vehicleId: '', driverId: '' }); }} title="Phân công xe" className="btn btn-icon btn-sm" style={{ background: 'var(--accent-light)', color: '#b45309', border: '1px solid #fde68a' }}>
                              <UserCheck size={15} />
                            </button>
                          )}
                          {['assigned', 'ongoing', 'completed'].includes(b.status) && (
                            <>
                              {b.pdfUrl && (
                                <a href={b.pdfUrl} target="_blank" rel="noreferrer" title="Xem PDF" className="btn btn-icon btn-sm" style={{ background: 'var(--info-light)', color: '#1d4ed8', border: '1px solid #bfdbfe', textDecoration: 'none' }}>
                                  <Download size={15} />
                                </a>
                              )}
                              <button onClick={() => generatePDF(b)} title="Tạo PDF" className="btn btn-icon btn-sm" style={{ background: 'var(--info-light)', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                <Check size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2>Tạo Lệnh Điều Xe</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Người / Đơn vị yêu cầu *</label><input required className="form-input" value={formData.requestor} onChange={e => setFormData({...formData, requestor: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Phòng ban</label><input className="form-input" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="P4, P11, BGD..." /></div>
                </div>
                <div className="form-group"><label className="form-label">Nơi đến *</label><input required className="form-input" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Nội dung / Mục đích *</label><input required className="form-input" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} /></div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Thời gian đi *</label><input required type="datetime-local" className="form-input" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Thời gian về *</label><input required type="datetime-local" className="form-input" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} /></div>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Thời lượng</label><input className="form-input" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="1 Ngày, 0.5 Ngày..." /></div>
                  <div className="form-group"><label className="form-label">Yêu cầu xe</label><input className="form-input" value={formData.vehicleRequest} onChange={e => setFormData({...formData, vehicleRequest: e.target.value})} placeholder="4 chỗ, 16 chỗ, BKS..." /></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="adhoc" checked={formData.isAdhoc} onChange={e => setFormData({...formData, isAdhoc: e.target.checked})} style={{ width: 16, height: 16 }} />
                  <label htmlFor="adhoc" style={{ fontSize: '0.9rem' }}>Lịch phát sinh (Bổ sung)</label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Huỷ</button>
                <button type="submit" className="btn btn-primary">Lưu lệnh</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModalId && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2>Phân công Xe & Tài xế</h2>
              <button className="modal-close" onClick={() => setAssignModalId(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAssign}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Chọn xe *</label>
                  <select required className="form-input" value={assignForm.vehicleId} onChange={e => setAssignForm({...assignForm, vehicleId: e.target.value})}>
                    <option value="">-- Chọn xe --</option>
                    {vehicles.filter(v => v.status === 'available').map(v => (
                      <option key={v._id} value={v._id}>{v.plate} — {v.model} ({v.type})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Chọn tài xế *</label>
                  <select required className="form-input" value={assignForm.driverId} onChange={e => setAssignForm({...assignForm, driverId: e.target.value})}>
                    <option value="">-- Chọn tài xế --</option>
                    {(drivers || []).map(d => (
                      <option key={d._id} value={d._id}>{d.name} ({d.phone})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAssignModalId(null)}>Huỷ</button>
                <button type="submit" className="btn btn-primary">Phân công</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
