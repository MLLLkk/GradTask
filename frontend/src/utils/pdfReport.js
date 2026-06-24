import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function downloadProjectReport(report) {
  const doc = new jsPDF()
  const project = report.project
  const summary = report.summary

  doc.setFontSize(18)
  doc.text('GradTask Project Progress Report', 14, 18)
  doc.setFontSize(11)
  doc.text(`Generated at: ${report.generated_at}`, 14, 28)
  doc.text(`Project: ${project.title}`, 14, 38)
  doc.text(`Supervisor: ${project.supervisor_name || '-'}`, 14, 46)
  doc.text(`Team Leader: ${project.leader_name || '-'}`, 14, 54)
  doc.text(`Progress: ${project.progress}%`, 14, 62)

  autoTable(doc, {
    startY: 72,
    head: [['Metric', 'Value']],
    body: [
      ['Total Tasks', summary.total_tasks || 0],
      ['Completed Tasks', summary.completed_tasks || 0],
      ['Pending Tasks', summary.pending_tasks || 0],
      ['In Progress Tasks', summary.in_progress_tasks || 0],
      ['Overdue Tasks', summary.overdue_tasks || 0],
    ],
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Member', 'Role', 'Assigned', 'Completed', 'Contribution Score']],
    body: report.members.map((m) => [m.name, m.role_in_project, m.assigned_tasks || 0, m.completed_tasks || 0, Number(m.contribution_score || 0).toFixed(2)]),
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Task', 'Assigned To', 'Priority', 'Status', 'Due Date']],
    body: report.tasks.map((t) => [t.title, t.assigned_name || '-', t.priority, t.status, t.due_date || '-']),
  })

  doc.save(`GradTask-${project.title.replace(/[^a-z0-9]/gi, '-')}-Report.pdf`)
}
