"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function parseISO(value?: string | null): { year?: number; month?: number; day?: number } {
  if (!value) return {}
  const [y, m, d] = value.split("-")
  const year = Number(y)
  const month = Number(m)
  const day = Number(d)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return {}
  return { year, month, day }
}

function toISO(year?: number, month?: number, day?: number): string {
  if (!year || !month || !day) return ""
  const y = String(year)
  const m = String(month).padStart(2, "0")
  const d = String(day).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function DateSelector({
  value,
  onChange,
  minYear = 2010,
  maxYear = new Date().getFullYear(),
}: {
  value?: string | null
  onChange: (next: string) => void
  minYear?: number
  maxYear?: number
}) {
  const parsed = parseISO(value)
  const [year, setYear] = React.useState<number | undefined>(parsed.year)
  const [month, setMonth] = React.useState<number | undefined>(parsed.month)
  const [day, setDay] = React.useState<number | undefined>(parsed.day)

  React.useEffect(() => {
    const next = toISO(year, month, day)
    onChange(next)
  }, [year, month, day])

  const years = React.useMemo(() => {
    const arr: number[] = []
    for (let y = maxYear; y >= minYear; y--) arr.push(y)
    return arr
  }, [minYear, maxYear])

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const days = React.useMemo(() => {
    if (!year || !month) return []
    return Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1)
  }, [year, month])

  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <span className="text-xs">Año</span>
        <Select value={year ? String(year) : ""} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="min-w-28">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs">Mes</span>
        <Select value={month ? String(month) : ""} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="min-w-24">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={String(m)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs">Día</span>
        <Select value={day ? String(day) : ""} onValueChange={(v) => setDay(Number(v))}>
          <SelectTrigger className="min-w-24">
            <SelectValue placeholder="Día" />
          </SelectTrigger>
          <SelectContent>
            {days.map((d) => (
              <SelectItem key={d} value={String(d)}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}