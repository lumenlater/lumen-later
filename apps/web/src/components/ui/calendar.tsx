import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type CalendarProps = {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  className?: string
  modifiers?: Record<string, Date[]>
  modifiersStyles?: Record<string, React.CSSProperties>
}

function Calendar({
  className,
  selected,
  onSelect,
  modifiers = {},
  modifiersStyles = {},
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected || new Date()
  )

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const renderCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    
    const days = []
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />)
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toDateString()
      const isSelected = selected && date.toDateString() === selected.toDateString()
      
      // Check modifiers
      let modifierStyles: React.CSSProperties = {}
      let modifierClasses = ""
      
      Object.entries(modifiers).forEach(([key, dates]) => {
        if (dates.some(d => d.toDateString() === dateStr)) {
          if (modifiersStyles[key]) {
            modifierStyles = { ...modifierStyles, ...modifiersStyles[key] }
          }
          modifierClasses += ` calendar-${key}`
        }
      })
      
      days.push(
        <button
          key={day}
          onClick={() => onSelect?.(date)}
          className={cn(
            "p-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground",
            isSelected && "bg-primary text-primary-foreground",
            modifierClasses
          )}
          style={modifierStyles}
        >
          {day}
        </button>
      )
    }
    
    return days
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    )
  }

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    )
  }

  return (
    <div className={cn("p-3", className)} {...props}>
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-medium">
          {currentMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-xs font-medium text-muted-foreground p-2">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {renderCalendar()}
      </div>
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }