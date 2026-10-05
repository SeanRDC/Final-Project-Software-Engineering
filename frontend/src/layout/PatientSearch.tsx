import { SearchIcon } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

type PatientSearchProps = {
  /** Called once the search is sent, so the mobile drawer can close. */
  onSearch?: () => void
}

/** Quick patient lookup. Pressing "/" anywhere outside a field jumps to it. */
export function PatientSearch({ onSearch }: PatientSearchProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = query.trim()
    if (!term) return
    void navigate(`/patients?q=${encodeURIComponent(term)}`)
    setQuery('')
    onSearch?.()
  }

  return (
    <form role="search" onSubmit={handleSubmit}>
      <InputGroup className="h-9">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          type="search"
          name="q"
          aria-label="Search patients by name or ID number"
          placeholder="Search patients…"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <InputGroupAddon align="inline-end">
          <Kbd aria-hidden="true">/</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
