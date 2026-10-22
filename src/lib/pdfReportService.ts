import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceSession } from './attendanceService';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

export interface GeneratedReportResult {
  reportId: string;
  blob: Blob;
  dataUri: string;
  filename: string;
}

/**
 * Generates an authoritative, professional A4 attendance PDF report for a finalized daily whole-class session
 */
export function generateAttendancePDF(
  session: AttendanceSession
): GeneratedReportResult {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const reportId = `REP-${session.classId.replace(/\s+/g, '')}-${session.date.replace(/-/g, '')}-V${
    (session.revisions?.length || 0) + 1
  }`;
  const filename = `AWKUM_Attendance_${session.classId.replace(/\s+/g, '_')}_${session.date}.pdf`;

  // 1. Header Banner & University Identification
  doc.setFillColor(73, 50, 34); // Espresso Brown #493222
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 249, 241); // Warm Cream #FFF9F1
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text('ABDUL WALI KHAN UNIVERSITY MARDAN', pageWidth / 2, 11, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Department of Computer Science & Software Engineering · Garden Campus', pageWidth / 2, 17, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CLASS REPRESENTATIVE (CR) OFFICIAL ATTENDANCE REPORT', pageWidth / 2, 23, { align: 'center' });

  // 2. Report Metadata Card
  doc.setFillColor(248, 240, 229); // Cream background #F8F0E5
  doc.setDrawColor(230, 216, 199); // Border #E6D8C7
  doc.roundedRect(14, 34, pageWidth - 28, 30, 2, 2, 'FD');

  doc.setTextColor(56, 39, 28); // #38271C
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Class: ${session.classId}`, 20, 42);
  doc.text(`Date: ${session.displayDate} (${session.dayOfWeek})`, 20, 49);
  doc.text(`Report ID: ${reportId}`, 20, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Recorded By: ${session.recordedByName} (CR)`, 110, 42);
  doc.text(`Email: ${session.recordedByEmail}`, 110, 49);
  doc.text(`Finalized: ${session.finalizedAt}`, 110, 56);

  // 3. Metrics Summary Badges
  const metricsY = 69;
  const colWidth = (pageWidth - 28 - 9) / 4;

  const metrics = [
    { label: 'TOTAL ENROLLED', val: `${session.totalEnrolled}`, fill: [255, 255, 255], text: [56, 39, 28] },
    { label: 'PRESENT TODAY', val: `${session.presentCount}`, fill: [234, 242, 233], text: [102, 128, 100] },
    { label: 'ABSENT TODAY', val: `${session.absentCount}`, fill: [253, 232, 228], text: [200, 75, 49] },
    { label: 'ATTENDANCE RATE', val: `${session.attendancePercentage}%`, fill: [239, 227, 211], text: [73, 50, 34] },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (colWidth + 3);
    doc.setFillColor(m.fill[0], m.fill[1], m.fill[2]);
    doc.setDrawColor(230, 216, 199);
    doc.roundedRect(x, metricsY, colWidth, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(128, 106, 86);
    doc.text(m.label, x + colWidth / 2, metricsY + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(m.text[0], m.text[1], m.text[2]);
    doc.text(m.val, x + colWidth / 2, metricsY + 12.5, { align: 'center' });
  });

  // If there are revisions/corrections, indicate at top
  let tableStartY = 90;
  if (session.revisions && session.revisions.length > 0) {
    const latestRev = session.revisions[session.revisions.length - 1];
    doc.setFillColor(255, 243, 205); // Warning yellow
    doc.setDrawColor(240, 213, 151);
    doc.roundedRect(14, 88, pageWidth - 28, 10, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(133, 100, 4);
    doc.text(`Official Correction Revision #${session.revisions.length} - Reason: ${latestRev.reason} (Amended by ${latestRev.revisedBy})`, 18, 94.5);
    tableStartY = 102;
  }

  // 4. Student Attendance Table with autoTable
  const recordsList = Object.values(session.records).sort((a, b) =>
    a.rollNumber.localeCompare(b.rollNumber)
  );

  const tableBody = recordsList.map((rec, index) => [
    index + 1,
    rec.rollNumber,
    rec.studentName,
    rec.status.toUpperCase(),
    rec.notes || (rec.status === 'present' ? 'Attended' : 'Unexcused'),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 14, right: 14, bottom: 20 },
    head: [['S.No', 'Roll Number', 'Student Full Name', 'Attendance Status', 'Remarks / Notes']],
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [73, 50, 34],
      textColor: [255, 249, 241],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [56, 39, 28],
    },
    alternateRowStyles: {
      fillColor: [248, 240, 229], // #F8F0E5
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 32, fontStyle: 'bold' },
      2: { cellWidth: 70 },
      3: { cellWidth: 32, fontStyle: 'bold' },
      4: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      // Color-code attendance status
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === 'PRESENT') {
          data.cell.styles.textColor = [102, 128, 100]; // Olive green
        } else if (data.cell.raw === 'ABSENT') {
          data.cell.styles.textColor = [200, 75, 49]; // Red
        }
      }
    },
    didDrawPage: (data) => {
      // Footer on every page
      const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(128, 106, 86);
      doc.text('AWKUM ClassHub · Official Department Attendance Archive · Verification: Validated', 14, pageHeight - 8);
      doc.text(pageStr, pageWidth - 14, pageHeight - 8, { align: 'right' });
      doc.setDrawColor(230, 216, 199);
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    },
  });

  const blob = doc.output('blob');
  const dataUri = doc.output('datauristring');

  return {
    reportId,
    blob,
    dataUri,
    filename,
  };
}

/**
 * Initiates direct browser download of the attendance PDF
 */
export function downloadAttendancePDF(session: AttendanceSession): void {
  const { blob, filename } = generateAttendancePDF(session);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Updates attendance session metadata with generated PDF report
 */
export async function markReportGenerated(session: AttendanceSession): Promise<void> {
  if (db) {
    try {
      const docRef = doc(db, 'attendanceSessions', session.id);
      await updateDoc(docRef, {
        pdfReportStatus: 'generated',
        pdfGeneratedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.info('[PDF Service] Report status record notice:', err);
    }
  }
}
