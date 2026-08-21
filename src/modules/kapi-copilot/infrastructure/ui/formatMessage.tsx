// Formatea el markdown liviano de Kapi (negritas, listas, párrafos) a JSX.
// En archivo propio porque useKapiChat.ts es .ts puro (sin JSX) y esto
// devuelve elementos React — lo usan las dos superficies (Drawer y
// CopilotFullView) exactamente igual.
export function formatMessage(content: string) {
  return content.split('\n').map((line, i) => {
    const isListItem = line.startsWith('- ') || line.startsWith('* ') || !!line.match(/^\d+\.\s/)

    let cleanLine = line
    if (line.startsWith('- ') || line.startsWith('* ')) {
      cleanLine = line.substring(2)
    } else if (line.match(/^\d+\.\s/)) {
      cleanLine = line.replace(/^\d+\.\s/, '')
    }

    const parts = cleanLine.split(/\*\*(.*?)\*\*/g)
    const formattedContent = parts.map((part, j) => {
      if (j % 2 === 1) {
        return <strong key={j} className="text-[#137C53] font-bold">{part}</strong>
      }
      return part
    })

    if (isListItem) {
      return (
        <li key={i} className="ml-5 list-disc text-sm text-[rgba(80,108,92,0.85)] my-1">
          {formattedContent}
        </li>
      )
    }

    if (line === '') {
      return <div key={i} className="h-2" />
    }

    return (
      <p key={i} className="leading-relaxed text-sm text-[rgba(80,108,92,0.85)] my-1">
        {formattedContent}
      </p>
    )
  })
}
