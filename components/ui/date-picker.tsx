"use client"

import * as React from "react"
import { IconCalendar } from "@tabler/icons-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

function toISODateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseISODate(value?: string | null): Date | undefined {
  if (!value) return undefined
  const parts = value.split("-")
  if (parts.length !== 3) return undefined
  const y = Number(parts[0])
  const m = Number(parts[1]) - 1
  const d = Number(parts[2])
  const dt = new Date(y, m, d)
  return isNaN(dt.getTime()) ? undefined : dt
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecciona fecha",
}: {
  value?: string | null
  onChange: (next: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  const selected = parseISODate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start w-44">
          <IconCalendar className="mr-2" />
          <span className="truncate text-left">
            {selected ? format(selected, "PPP") : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(toISODateString(d))
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}