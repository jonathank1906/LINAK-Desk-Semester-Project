import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TimePicker({ value, onChange, disabled, className, id }) {

  const hours = ["00","01","02","03","04","05","06","07","08","09",
                 "10","11","12","13","14","15","16","17","18","19",
                 "20","21","22","23"];

  const minutes = ["00", "15", "30", "45"];

  let currentHour = "00";
  let currentMinute = "00";
  
  if (value) {
    const parts = value.split(":");
    if (parts.length === 2) {
      currentHour = parts[0];
      currentMinute = parts[1];
    }
  }

  const handleHourChange = (hour) => {
    onChange(`${hour}:${currentMinute}`);
  };

  const handleMinuteChange = (minute) => {
    onChange(`${currentHour}:${minute}`);
  };

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Select
        value={currentHour}
        onValueChange={handleHourChange}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-[80px]">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((hour) => (
            <SelectItem key={hour} value={hour}>
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select
        value={currentMinute}
        onValueChange={handleMinuteChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((minute) => (
            <SelectItem key={minute} value={minute}>
              {minute}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

