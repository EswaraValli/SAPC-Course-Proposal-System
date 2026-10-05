import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink, Calendar, User, Clock, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { STATUS_OPTIONS } from '../constants/sapcOptions';

export default function ProposalDetailModal({ proposalId, onClose, currentUser, onStatusUpdated }) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status update within modal
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!proposalId) return;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getProposalDetail(proposalId);
        if (res.success && res.proposal) {
          setProposal(res.proposal);
          setSelectedStatus(res.proposal.status);
        } else {
          setError('Proposal not found');
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch proposal details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [proposalId]);

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('sapc_token');
    if (!token) {
      alert('You must be logged in as an Academic Office administrator to change status.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const res = await api.updateProposalStatus(proposalId, selectedStatus, statusRemarks, token);
      if (res.success) {
        setProposal(res.proposal);
        setStatusRemarks('');
        if (onStatusUpdated) onStatusUpdated();
        alert(`Status updated to '${selectedStatus}' successfully.`);
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (!proposalId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 860 }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              IIT Gandhinagar — ACAD-SAPC-01
            </div>
            <div className="modal-title">
              Proposal Details: {proposal?.proposal_id || proposalId}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              Loading proposal details...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#b91c1c' }}>
              <AlertTriangle size={24} style={{ marginBottom: 6 }} />
              <div>{error}</div>
            </div>
          ) : proposal ? (
            <div>
              {/* Top Banner with Title and Badges */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 18, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#002147', marginBottom: 4 }}>
                      {proposal.course_title}
                    </h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="badge badge-approved" style={{ fontSize: 11 }}>
                        {proposal.course_type}
                      </span>
                      <span className="badge badge-review" style={{ fontSize: 11 }}>
                        Level {proposal.course_level}
                        {proposal.course_level_secondary ? ` & Level ${proposal.course_level_secondary}` : ''}
                      </span>
                      <span className="badge" style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontSize: 11 }}>
                        L-T-P-C: {proposal.course_l_t_p_c} ({proposal.credits} Credits)
                      </span>
                      {proposal.is_modification ? (
                        <span className="badge badge-rejected" style={{ fontSize: 11 }}>
                          Modification (Code: {proposal.existing_course_code || 'N/A'})
                        </span>
                      ) : (
                        <span className="badge badge-approved" style={{ fontSize: 11 }}>
                          New Course
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Current Status:</div>
                    <div style={{ marginTop: 2 }}>
                      <span className="badge badge-pending" style={{ fontSize: 13, padding: '4px 10px' }}>
                        {proposal.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Grid Sections */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* Proposer Info */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 14 }}>
                  <div style={{ fontWeight: 700, color: '#002147', fontSize: 13, borderBottom: '1px solid #f1f5f9', paddingBottom: 6, marginBottom: 8 }}>
                    Proposer & Instructors
                  </div>
                  <div style={{ fontSize: 12.5, marginBottom: 6 }}>
                    <strong>Name of Proposer:</strong> {proposal.proposer_name}
                  </div>
                  <div style={{ fontSize: 12.5, marginBottom: 6 }}>
                    <strong>Potential Instructor(s):</strong> {proposal.potential_instructors}
                  </div>
                  <div style={{ fontSize: 12.5, marginBottom: 6 }}>
                    <strong>Faculty Email:</strong> {proposal.faculty_email}
                  </div>
                  <div style={{ fontSize: 12.5 }}>
                    <strong>Submitted On:</strong> {new Date(proposal.submission_date).toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Offering Info */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 14 }}>
                  <div style={{ fontWeight: 700, color: '#002147', fontSize: 13, borderBottom: '1px solid #f1f5f9', paddingBottom: 6, marginBottom: 8 }}>
                    Duration & Offering
                  </div>
                  <div style={{ fontSize: 12.5, marginBottom: 6 }}>
                    <strong>Course Duration:</strong> {proposal.course_duration}
                  </div>
                  <div style={{ fontSize: 12.5, marginBottom: 6 }}>
                    <strong>Frequency of Offering:</strong> {proposal.expected_frequency}
                    {proposal.expected_frequency_other ? ` (${proposal.expected_frequency_other})` : ''}
                  </div>
                  <div style={{ fontSize: 12.5, marginBottom: 6 }}>
                    <strong>BTech Elective Basket:</strong> {proposal.elective_basket_btech || 'None'}
                  </div>
                  <div style={{ fontSize: 12.5 }}>
                    <strong>Minor(s):</strong> {proposal.minors || 'None'}
                    {proposal.minor_basket_thematic_area ? ` [Thematic Area: ${proposal.minor_basket_thematic_area}]` : ''}
                  </div>
                </div>
              </div>

              {/* Syllabus & Course Content Blocks */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#002147', fontSize: 13, marginBottom: 4 }}>
                  Course Contents (separated by semicolons):
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12.5, whiteSpace: 'pre-wrap' }}>
                  {proposal.course_contents}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#002147', fontSize: 13, marginBottom: 4 }}>
                  Texts and References (MLA/APA format):
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12.5, whiteSpace: 'pre-wrap' }}>
                  {proposal.texts_and_references}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#002147', fontSize: 13, marginBottom: 4 }}>
                  Learning Outcomes:
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12.5, whiteSpace: 'pre-wrap' }}>
                  {proposal.learning_outcomes}
                </div>
              </div>

              {proposal.overlap_courses && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: '#002147', fontSize: 13, marginBottom: 4 }}>
                    Overlap with Other Approved Courses:
                  </div>
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12.5 }}>
                    {proposal.overlap_courses}
                  </div>
                </div>
              )}

              {proposal.other_relevant_info && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: '#002147', fontSize: 13, marginBottom: 4 }}>
                    Any Other Relevant Information:
                  </div>
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12.5 }}>
                    {proposal.other_relevant_info}
                  </div>
                </div>
              )}

              {/* Status Audit History Timeline */}
              {proposal.history && proposal.history.length > 0 && (
                <div style={{ marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                  <div style={{ fontWeight: 700, color: '#002147', fontSize: 14, marginBottom: 12 }}>
                    Status Review Audit Trail
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {proposal.history.map((h, idx) => (
                      <div key={idx} style={{ background: '#f8fafc', padding: 10, borderRadius: 6, borderLeft: '3px solid #002147', fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>
                            Status: {h.new_status} {h.previous_status ? `(Previous: ${h.previous_status})` : ''}
                          </span>
                          <span style={{ color: '#64748b' }}>
                            {new Date(h.changed_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div style={{ color: '#475569' }}>
                          Changed by: <strong>{h.changed_by}</strong> — {h.remarks || 'No remarks entered.'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Status Update Form */}
              {currentUser && (
                <form onSubmit={handleStatusSubmit} style={{ marginTop: 24, padding: 16, background: '#f1f5f9', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                  <div style={{ fontWeight: 700, color: '#002147', fontSize: 13.5, marginBottom: 10 }}>
                    Update Proposal Status (Academic Office Authority)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 10, alignItems: 'center' }}>
                    <select
                      className="form-control"
                      value={selectedStatus}
                      onChange={e => setSelectedStatus(e.target.value)}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter review remarks / notes for record..."
                      value={statusRemarks}
                      onChange={e => setStatusRemarks(e.target.value)}
                    />

                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? 'Updating...' : 'Save Status'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {proposal && (
            <div style={{ display: 'flex', gap: 10 }}>
              <a
                href={api.getPdfDownloadUrl(proposal.proposal_id)}
                className="btn btn-primary btn-sm"
                download={`${proposal.proposal_id}.pdf`}
              >
                <Download size={14} />
                <span>Download PDF</span>
              </a>

              <a
                href={api.getPdfViewUrl(proposal.proposal_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <ExternalLink size={14} />
                <span>View PDF</span>
              </a>
            </div>
          )}

          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
