import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceSession } from './attendanceService';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { AssignmentItem } from '../data/portalData';
import { SubjectConfig, AdminUser } from '../data/adminData';
import { ClassStudentItem } from '../data/classRosterData';
import { TeacherSubmissionItem } from './teacherService';

export interface GeneratedReportResult {
  reportId: string;
  blob: Blob;
  dataUri: string;
  filename: string;
}

export interface AssignmentReportParams {
  assignment: AssignmentItem;
  subject: SubjectConfig;
  teacher: AdminUser;
  eligibleRoster: ClassStudentItem[];
  submissions: TeacherSubmissionItem[];
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

/**
 * Generates and downloads Weekly Attendance Report PDF in landscape format
 */
export function generateWeeklyAttendancePDF(
  classId: string,
  startDate: string,
  endDate: string,
  year: string,
  roster: { id: string; name: string; rollNumber: string }[],
  sessions: AttendanceSession[]
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const filename = `AWKUM_Weekly_Attendance_${classId.replace(/\s+/g, '_')}_${startDate}_${endDate}.pdf`;

  doc.setFillColor(73, 50, 34);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 249, 241);
  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.text('ABDUL WALI KHAN UNIVERSITY MARDAN', pageWidth / 2, 9, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Weekly Attendance Report · Class: ${classId} · Range: ${startDate} - ${endDate}, ${year}`, pageWidth / 2, 17, { align: 'center' });

  const tableBody = roster.map((st, index) => {
    let presentCount = 0;
    let absentCount = 0;
    sessions.forEach(s => {
      const rec = s.records[st.rollNumber];
      if (rec?.status === 'present') presentCount++;
      else if (rec) absentCount++;
    });
    const total = sessions.length;
    const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    return [index + 1, st.rollNumber, st.name, presentCount, absentCount, `${rate}%`];
  });

  autoTable(doc, {
    startY: 32,
    margin: { left: 14, right: 14, bottom: 20 },
    head: [['S.No', 'Roll Number', 'Student Full Name', 'Total Present', 'Total Absent', 'Weekly Rate']],
    body: tableBody,
    theme: 'plain',
    headStyles: { fillColor: [73, 50, 34], textColor: [255, 249, 241], fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [56, 39, 28] },
    alternateRowStyles: { fillColor: [248, 240, 229] },
    didDrawPage: (data) => {
      const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(128, 106, 86);
      doc.text('AWKUM ClassHub · Official Weekly Attendance Summary', 14, pageHeight - 8);
      doc.text(pageStr, pageWidth - 14, pageHeight - 8, { align: 'right' });
    },
  });

  const blob = doc.output('blob');
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
 * Generates and downloads Monthly Attendance Report PDF in landscape format
 */
export function generateMonthlyAttendancePDF(
  classId: string,
  monthName: string,
  year: string,
  roster: { id: string; name: string; rollNumber: string }[],
  sessions: AttendanceSession[]
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const filename = `AWKUM_Monthly_Attendance_${classId.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`;

  doc.setFillColor(73, 50, 34);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 249, 241);
  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.text('ABDUL WALI KHAN UNIVERSITY MARDAN', pageWidth / 2, 9, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Monthly Attendance Report · Class: ${classId} · Month: ${monthName} ${year}`, pageWidth / 2, 17, { align: 'center' });

  const tableBody = roster.map((st, index) => {
    let presentCount = 0;
    let absentCount = 0;
    sessions.forEach(s => {
      const rec = s.records[st.rollNumber];
      if (rec?.status === 'present') presentCount++;
      else if (rec) absentCount++;
    });
    const total = sessions.length;
    const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    return [index + 1, st.rollNumber, st.name, presentCount, absentCount, `${rate}%`];
  });

  autoTable(doc, {
    startY: 32,
    margin: { left: 14, right: 14, bottom: 20 },
    head: [['S.No', 'Roll Number', 'Student Full Name', 'Total Present', 'Total Absent', 'Monthly Rate']],
    body: tableBody,
    theme: 'plain',
    headStyles: { fillColor: [73, 50, 34], textColor: [255, 249, 241], fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [56, 39, 28] },
    alternateRowStyles: { fillColor: [248, 240, 229] },
    didDrawPage: (data) => {
      const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(128, 106, 86);
      doc.text('AWKUM ClassHub · Official Monthly Attendance Summary', 14, pageHeight - 8);
      doc.text(pageStr, pageWidth - 14, pageHeight - 8, { align: 'right' });
    },
  });

  const blob = doc.output('blob');
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
 * Generates an authoritative, professional A4 assignment submission and marks evaluation report
 */
export function generateAssignmentReportPDF(
  params: AssignmentReportParams
): GeneratedReportResult {
  const { assignment, subject, teacher, eligibleRoster, submissions } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxMarks = assignment.totalMarks || 10;

  const nowEpoch = Date.now();
  let deadlineEpoch = 0;
  if (assignment.deadlineAt) {
    deadlineEpoch = new Date(assignment.deadlineAt).getTime();
  } else if (assignment.dueDate) {
    deadlineEpoch = new Date(`${assignment.dueDate}T23:59:59`).getTime();
  }

  const isClosed =
    assignment.status === 'closed' || (deadlineEpoch > 0 && nowEpoch > deadlineEpoch);

  const reportStatus = isClosed
    ? 'FINAL ARCHIVE (Submissions Closed)'
    : 'PRELIMINARY AUDIT (Submissions Active)';

  const targetClassLabel = assignment.targetClass || subject.assignedClass || 'Universal';
  const cleanClassCode = targetClassLabel.replace(/[^a-zA-Z0-9]/g, '');
  const reportId = `ASG-${cleanClassCode}-${subject.code}-${assignment.id.slice(-6).toUpperCase()}`;
  const filename = `AWKUM_Assignment_${cleanClassCode}_${subject.code}_${assignment.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}.pdf`;

  // 1. Header Banner & University Identification
  doc.setFillColor(73, 50, 34); // Espresso Brown #493222
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 249, 241); // Warm Cream #FFF9F1
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text('ABDUL WALI KHAN UNIVERSITY MARDAN', pageWidth / 2, 11, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Department of Computer Science & Software Engineering · Garden Campus', pageWidth / 2, 17, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('OFFICIAL ASSIGNMENT EVALUATION & SUBMISSION ARCHIVE', pageWidth / 2, 23, { align: 'center' });

  // 2. Report Metadata Card
  doc.setFillColor(248, 240, 229); // Cream background #F8F0E5
  doc.setDrawColor(230, 216, 199); // Border #E6D8C7
  doc.roundedRect(14, 33, pageWidth - 28, 33, 2, 2, 'FD');

  doc.setTextColor(56, 39, 28); // #38271C
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Subject: ${subject.name} (${subject.code})`, 19, 41);
  doc.text(`Assignment: ${assignment.title}`, 19, 47);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(128, 106, 86);
  doc.text(`Class Scope: ${targetClassLabel}`, 19, 53);
  doc.text(`Report Status: ${reportStatus}`, 19, 59);

  doc.setTextColor(56, 39, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Instructor: ${teacher.name || assignment.teacher || 'Faculty Teacher'}`, 115, 41);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(128, 106, 86);
  doc.text(`Email: ${teacher.email || assignment.teacherEmail || 'faculty@awkum.edu.pk'}`, 115, 47);
  doc.text(`Deadline: ${assignment.dueDate} ${assignment.dueTime ? `(${assignment.dueTime})` : ''}`, 115, 53);
  doc.text(`Total Marks: ${maxMarks} Points · ID: ${reportId}`, 115, 59);

  // 3. Authoritative Counts and Metrics Summary
  // Sort submissions: Latest submissions first
  const sortedSubmissions = [...submissions].sort((a, b) => {
    const timeA = new Date(a.submittedAt || a.timestamp || 0).getTime();
    const timeB = new Date(b.submittedAt || b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  const submittedCount = sortedSubmissions.length;
  const gradedList = sortedSubmissions.filter(
    (s) => s.grade !== undefined && s.grade !== null && s.grade !== ''
  );
  const gradedCount = gradedList.length;
  const pendingReviewCount = submittedCount - gradedCount;
  const lateCount = sortedSubmissions.filter((s) => s.isLate).length;

  const totalEligible = eligibleRoster.length > 0 ? eligibleRoster.length : Math.max(submittedCount, 1);
  const notSubmittedCount = Math.max(0, totalEligible - submittedCount);

  let avgMarksStr = 'N/A';
  if (gradedCount > 0) {
    const totalScore = gradedList.reduce((sum, s) => sum + (Number(s.grade) || 0), 0);
    avgMarksStr = `${(totalScore / gradedCount).toFixed(1)} / ${maxMarks}`;
  }

  const metricsY = 70;
  const metricBoxWidth = (pageWidth - 28 - 12.5) / 6;

  const metrics = [
    { label: 'ELIGIBLE', val: `${totalEligible}`, fill: [255, 255, 255], text: [56, 39, 28] },
    { label: 'SUBMITTED', val: `${submittedCount}`, fill: [234, 242, 233], text: [102, 128, 100] },
    { label: 'GRADED', val: `${gradedCount}`, fill: [239, 227, 211], text: [73, 50, 34] },
    { label: 'PENDING', val: `${pendingReviewCount}`, fill: [255, 248, 220], text: [160, 110, 20] },
    { label: 'LATE', val: `${lateCount}`, fill: [253, 232, 228], text: [200, 75, 49] },
    { label: 'AVG SCORE', val: avgMarksStr, fill: [248, 240, 229], text: [73, 50, 34] },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (metricBoxWidth + 2.5);
    doc.setFillColor(m.fill[0], m.fill[1], m.fill[2]);
    doc.setDrawColor(230, 216, 199);
    doc.roundedRect(x, metricsY, metricBoxWidth, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(128, 106, 86);
    doc.text(m.label, x + metricBoxWidth / 2, metricsY + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(m.text[0], m.text[1], m.text[2]);
    doc.text(m.val, x + metricBoxWidth / 2, metricsY + 10.5, { align: 'center' });
  });

  // 4. Student Evaluation Table
  // Build submitted rows first (ordered latest first)
  const submittedSet = new Set<string>();
  const tableRows: any[][] = [];

  sortedSubmissions.forEach((sub, idx) => {
    const roll = sub.studentId || '--';
    const name = sub.studentName || 'Student';
    const email = sub.studentEmail || '';
    if (email) submittedSet.add(email.toLowerCase());
    if (roll) submittedSet.add(roll.toLowerCase());

    const isGraded = sub.grade !== undefined && sub.grade !== null && sub.grade !== '';
    let statusText = 'PENDING REVIEW';
    if (isGraded) {
      statusText = sub.isLate ? 'GRADED (LATE)' : 'GRADED';
    } else if (sub.isLate) {
      statusText = 'LATE SUBMISSION';
    }

    const marksStr = isGraded ? `${sub.grade} / ${maxMarks}` : 'Pending';
    const remarks = sub.feedback
      ? sub.feedback
      : sub.isLate
      ? 'Submitted after official deadline'
      : 'Submitted on time';

    tableRows.push([
      idx + 1,
      roll,
      name,
      statusText,
      sub.submittedAt || sub.timestamp || 'Recently',
      marksStr,
      remarks,
    ]);
  });

  // Then add not-submitted eligible students (ordered by roll number)
  const notSubmittedStudents = eligibleRoster.filter(
    (st) =>
      !submittedSet.has(st.email.toLowerCase()) &&
      !submittedSet.has(st.rollNumber.toLowerCase())
  ).sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));

  notSubmittedStudents.forEach((st) => {
    tableRows.push([
      tableRows.length + 1,
      st.rollNumber,
      st.name,
      'NOT SUBMITTED',
      '--',
      `0 / ${maxMarks}`,
      'No submission recorded for this assignment',
    ]);
  });

  autoTable(doc, {
    startY: 88,
    margin: { left: 14, right: 14, bottom: 20 },
    head: [
      ['S.No', 'Roll Number', 'Student Full Name', 'Status', 'Submitted At', 'Marks', 'Remarks / Feedback'],
    ],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [73, 50, 34],
      textColor: [255, 249, 241],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [56, 39, 28],
    },
    alternateRowStyles: {
      fillColor: [248, 240, 229],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 44 },
      3: { cellWidth: 30, fontStyle: 'bold' },
      4: { cellWidth: 24 },
      5: { cellWidth: 18, fontStyle: 'bold' },
      6: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const raw = String(data.cell.raw || '');
        if (raw.includes('GRADED')) {
          data.cell.styles.textColor = [102, 128, 100]; // Green
        } else if (raw.includes('NOT SUBMITTED')) {
          data.cell.styles.textColor = [180, 50, 40]; // Dark Red
        } else if (raw.includes('LATE')) {
          data.cell.styles.textColor = [200, 75, 49]; // Red/Orange
        } else {
          data.cell.styles.textColor = [140, 95, 20]; // Amber
        }
      }
    },
    didDrawPage: (data) => {
      const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(128, 106, 86);
      doc.text(
        'AWKUM ClassHub · Official Department Evaluation Archive · Verification: Validated',
        14,
        pageHeight - 8
      );
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
 * Downloads the authoritative Assignment Evaluation PDF directly
 */
export function downloadAssignmentReportPDF(params: AssignmentReportParams): void {
  const { blob, filename } = generateAssignmentReportPDF(params);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

