import DashboardShell from '@/components/layout/DashboardShell'
import CopilotFullView from '@/modules/kapi-copilot/infrastructure/ui/CopilotFullView'

export default function CopilotPage() {
  return (
    <DashboardShell>
      <CopilotFullView />
    </DashboardShell>
  )
}
