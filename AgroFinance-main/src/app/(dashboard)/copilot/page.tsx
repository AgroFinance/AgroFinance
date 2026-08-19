'use client'

import DashboardShell from '@/shared/components/layout/DashboardShell'
import CopilotFullView from '@/modules/kapi-copilot/infrastructure/ui/CopilotFullView'

export default function CopilotPage() {
  return (
    <DashboardShell>
      <CopilotFullView />
    </DashboardShell>
  )
}
