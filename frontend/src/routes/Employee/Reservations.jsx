import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import axios from "axios";
import { toast } from "sonner";
import { CalendarIcon, Clock, LogOut } from "lucide-react"; // LogOut imported here
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { formatTimeFromISO } from "@/utils/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from '@/components/ui/shadcn-io/spinner';

// Helper to get YYYY-MM-DD in LOCAL time
const formatLocalYYYYMMDD = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function formatDate(date) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function isValidDate(date) {
  if (!date) return false;
  return !isNaN(date.getTime());
}

export default function Reservations({ setSelectedDeskId }) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableDesks, setAvailableDesks] = useState([]);
  const [userReservations, setUserReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  function roundUpToNextInterval(date, intervalMins = 30) {
    const d = new Date(date);
    const mins = d.getMinutes();
    const remainder = mins % intervalMins;
    if (remainder === 0) return new Date(d);
    const diff = intervalMins - remainder;
    d.setMinutes(mins + diff, 0, 0);
    return d;
  }

  function formatHHMM(d) {
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  function getDefaultTimesForDate(date) {
    if (!date) return { start: "09:00", end: "17:00" };
    const now = new Date();
    const target = new Date(date);
    if (target.toDateString() === now.toDateString()) {
      let start = roundUpToNextInterval(now, 30);
      if (start.getHours() < 6) start = new Date(target.setHours(6, 0, 0, 0));
      if (start.getHours() > 22) start = new Date(target.setHours(22, 0, 0, 0));
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      return { start: formatHHMM(start), end: formatHHMM(end) };
    }
    return { start: "09:00", end: "17:00" };
  }

  const initialTimes = getDefaultTimesForDate(new Date());
  const [startTime, setStartTime] = useState(initialTimes.start);
  const [endTime, setEndTime] = useState(initialTimes.end);
  
  const [editingReservation, setEditingReservation] = useState(null);
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("17:00");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const nav = useNavigate();

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(selectedDate);
  const [datePickerValue, setDatePickerValue] = useState(formatDate(selectedDate));

  useEffect(() => {
    const updateTimes = () => {
      const defaults = getDefaultTimesForDate(selectedDate);
      setStartTime(defaults.start);
      setEndTime(defaults.end);
    };
    updateTimes();
    const interval = setInterval(updateTimes, 60000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  function generateSelectTimeOptions(selectedDate, startFrom = "06:00", minInterval = 0) {
    const options = [];
    if (!selectedDate || !(selectedDate instanceof Date)) return options;

    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    const [startHour, startMinute] = startFrom.split(":").map(Number);
    const minAllowed = new Date(selectedDate);
    minAllowed.setHours(startHour);
    minAllowed.setMinutes(startMinute + minInterval);
    minAllowed.setSeconds(0);
    minAllowed.setMilliseconds(0);

    for (let h = 6; h <= 22; h++) {
      for (let m of [0, 30]) {
        const time = new Date(selectedDate);
        time.setHours(h, m, 0, 0);

        if ((isToday && time <= now) || time < minAllowed) continue;

        const label = `${h.toString().padStart(2, "0")}:${m === 0 ? "00" : "30"}`;
        options.push(
          <SelectItem key={label} value={label}>
            {label}
          </SelectItem>
        );
      }
    }
    return options;
  }

  useEffect(() => {
    fetchAvailableDesks();
    fetchUserReservations();
    // eslint-disable-next-line
  }, [selectedDate, startTime, endTime]);

  const fetchAvailableDesks = async () => {
    setLoading(true);
    try {
      const formattedDate = formatLocalYYYYMMDD(selectedDate);
      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };

      const response = await axios.get(
        `http://localhost:8000/api/desks/available/?date=${formattedDate}&start_time=${startTime}&end_time=${endTime}`,
        config
      );
      setAvailableDesks(response.data);
    } catch (err) {
      console.error("API error:", err);
      toast.error("Failed to fetch available desks");
      setAvailableDesks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReservations = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
      const response = await axios.get(`http://localhost:8000/api/reservations/`, config);
      setUserReservations(response.data);
    } catch (err) {
      console.error("API error:", err);
      setUserReservations([]);
    }
  };

  const makeReservation = async (deskId) => {
    try {
      if (startTime >= endTime) {
        toast.error("Start time must be before end time");
        return;
      }
      const formattedDate = formatLocalYYYYMMDD(selectedDate);
      const payload = {
        desk: deskId,
        start_time: `${formattedDate} ${startTime}`,
        end_time: `${formattedDate} ${endTime}`,
      };
      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
      await axios.post(`http://localhost:8000/api/reservations/create/`, payload, config);
      toast.success("Reservation created!", { description: `Desk reserved for ${formattedDate}` });
      fetchAvailableDesks();
      fetchUserReservations();
      window.dispatchEvent(new Event("reservation-updated"));
    } catch (err) {
      console.error("API error:", err);
      toast.error("Failed to create reservation", { description: err.response?.data?.error || err.message });
    }
  };

  const handleEditReservation = async () => {
    if (!editingReservation) return;
    if (editStartTime >= editEndTime) {
      toast.error("Start time must be before end time");
      return;
    }
    const formattedDate = formatLocalYYYYMMDD(selectedDate);
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
      await axios.patch(
        `http://localhost:8000/api/reservations/${editingReservation.id}/edit/`,
        {
          start_time: `${formattedDate} ${editStartTime}`,
          end_time: `${formattedDate} ${editEndTime}`,
        },
        config
      );
      toast.success("Reservation updated!");
      setEditingReservation(null);
      setEditDialogOpen(false);
      fetchUserReservations();
      fetchAvailableDesks();
      window.dispatchEvent(new Event("reservation-updated"));
    } catch (err) {
      console.error("API error:", err);
      toast.error("Failed to update reservation");
    }
  };

  const cancelReservation = async (reservationId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
      await axios.post(`http://localhost:8000/api/reservations/${reservationId}/cancel/`, {}, config);
      toast.success("Reservation deleted!");
      setUserReservations((prev) => prev.filter((res) => res.id !== reservationId));
      fetchUserReservations();
      fetchAvailableDesks();
      window.dispatchEvent(new Event("reservation-updated"));
      if (setSelectedDeskId) setSelectedDeskId(null);
    } catch (err) {
      console.error("API error:", err);
      toast.error("Failed to cancel reservation");
    }
  };

  const handleCheckOut = async (reservationId) => {
    try {
        const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
        await axios.post(`http://localhost:8000/api/reservations/${reservationId}/check_out/`, {}, config);
        
        toast.success("Checked out successfully", { description: "Session ended." });
        
        fetchUserReservations();
        fetchAvailableDesks();
        window.dispatchEvent(new Event("reservation-updated"));
        
        if (setSelectedDeskId) setSelectedDeskId(null);
    } catch (err) {
        console.error("API error:", err);
        toast.error("Failed to check out", { description: err.response?.data?.error || err.message });
    }
  };

  const handleDatePickerChange = (date) => {
    setSelectedDate(date);
    setDatePickerMonth(date);
    setDatePickerValue(formatDate(date));
    const defaults = getDefaultTimesForDate(date);
    setStartTime(defaults.start);
    setEndTime(defaults.end);
  };

  const filteredReservations = userReservations.filter(
    (r) => r.status === "confirmed" || r.status === "active"
  );

  const deskCardHeight = "80px";

  return (
    <div className="container mx-auto p-6 space-y-6">
      
      {/* 1. YOUR RESERVATIONS SECTION */}
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Your Reservations</CardTitle>
          <CardDescription>Manage all your desk reservations</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReservations.length === 0 ? (
            <p className="text-center text-muted-foreground">No reservations found</p>
          ) : (
            <div className="space-y-3">
              {filteredReservations.map((reservation, idx) => {
                const isActive = reservation.status === "active";
                const deskName = reservation.desk_name || `Desk ${reservation.desk_id}`;
                const dateStr = new Date(reservation.start_time).toLocaleDateString("en-GB", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                const startTime = formatTimeFromISO(reservation.start_time) || "N/A";
                const endTime = formatTimeFromISO(reservation.end_time) || "N/A";
                return (
                  <div key={reservation.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-semibold text-foreground">{dateStr}</span>
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                          {deskName}
                        </div>
                        {reservation.start_time && reservation.end_time && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-border text-muted-foreground text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            <span>
                              {startTime} - {endTime}
                            </span>
                          </div>
                        )}
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-800">
                            Active Session
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="gap-2"
                          onClick={() => handleCheckOut(reservation.id)}
                        >
                          <LogOut className="w-4 h-4" />
                          Release Desk
                        </Button>
                      ) : (
                        <>
                          <Dialog open={editingReservation?.id === reservation.id && editDialogOpen} onOpenChange={(open) => {
                            if (!open) {
                              setEditingReservation(null);
                              setEditDialogOpen(false);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" onClick={() => {
                                setEditingReservation(reservation);
                                setEditStartTime(formatTimeFromISO(reservation.start_time));
                                setEditEndTime(formatTimeFromISO(reservation.end_time));
                                setEditDialogOpen(true);
                              }}>Edit</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit Reservation</DialogTitle>
                              </DialogHeader>
                              <div className="flex flex-row gap-4">
                                <div className="space-y-2 w-1/2">
                                  <label className="block text-sm font-medium">Start Time</label>
                                  <Select value={editStartTime} onValueChange={setEditStartTime}>
                                    <SelectTrigger className="w-full border rounded px-2 py-1">
                                      <SelectValue placeholder="Select start time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {generateSelectTimeOptions(selectedDate, "06:00", 0)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2 w-1/2">
                                  <label className="block text-sm font-medium">End Time</label>
                                  <Select value={editEndTime} onValueChange={setEditEndTime}>
                                    <SelectTrigger className="w-full border rounded px-2 py-1">
                                      <SelectValue placeholder="Select end time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {generateSelectTimeOptions(selectedDate, editStartTime, 30)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => {
                                  setEditingReservation(null);
                                  setEditDialogOpen(false);
                                }}>Cancel</Button>
                                <Button onClick={handleEditReservation}>Save</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button variant="destructive" onClick={() => cancelReservation(reservation.id)}>Delete</Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. FIND A DESK SECTION */}
      <div className="relative flex flex-col lg:flex-row gap-6">
        
        {/* Sticky Filters */}
        <div className="lg:w-1/3 w-full lg:sticky lg:top-6 z-40 h-fit">
          <Card>
            <CardHeader>
              <CardTitle>Reservation Filters</CardTitle>
              <CardDescription>Select date and time to find available desks</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 w-full">
                <Label htmlFor="date" className="px-1">Reservation Date</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="date"
                    value={datePickerValue}
                    placeholder="June 01, 2025"
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      setDatePickerValue(e.target.value);
                      if (isValidDate(date)) handleDatePickerChange(date);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setDatePickerOpen(true);
                      }
                    }}
                  />
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="absolute top-1/2 right-2 size-6 -translate-y-1/2">
                        <CalendarIcon className="size-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="end" alignOffset={-8} sideOffset={10}>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        captionLayout="dropdown"
                        month={datePickerMonth}
                        onMonthChange={setDatePickerMonth}
                        onSelect={(date) => {
                          handleDatePickerChange(date);
                          setDatePickerOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex flex-row gap-4 w-full">
                <div className="flex flex-col w-1/2 min-w-0">
                  <label className="text-sm font-medium mb-1">Start Time</label>
                  <Select value={startTime} onValueChange={(newStart) => {
                    setStartTime(newStart);
                    const [h, m] = newStart.split(":").map(Number);
                    const endDate = new Date();
                    endDate.setHours(h);
                    endDate.setMinutes(m + 30);
                    const nextEnd = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes() < 30 ? "00" : "30"}`;
                    if (endTime <= newStart) setEndTime(nextEnd);
                  }}>
                    <SelectTrigger className="w-full border rounded px-2 py-1">
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateSelectTimeOptions(selectedDate)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col w-1/2 min-w-0">
                  <label className="text-sm font-medium mb-1">End Time</label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger className="w-full border rounded px-2 py-1">
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateSelectTimeOptions(selectedDate, startTime, 30)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Desks List */}
        <div className="lg:w-2/3 w-full">
          <Card>
            <CardHeader>
              <CardTitle>
                Available Desks for {selectedDate?.toLocaleDateString()}
                {startTime && endTime ? ` from ${startTime} to ${endTime}` : ""}
              </CardTitle>
              <CardDescription>Click reserve to book a desk for the selected date</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8"><Spinner variant="circle"/></div>
              ) : availableDesks.length === 0 ? (
                <p className="text-center text-muted-foreground">No desks available for this date</p>
              ) : (
                <div className="space-y-3">
                  {availableDesks.map((desk) => {
                    // --- AVAILABILITY BADGES ---
                    let availabilityBadge = null;
                    if (desk.free_all_day) {
                        availabilityBadge = (
                            <span className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800">
                                Available all day
                            </span>
                        );
                    } else if (desk.available_until) {
                        const timeStr = new Date(desk.available_until).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        availabilityBadge = (
                            <span className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3 h-3" />
                                Available until {timeStr}
                            </span>
                        );
                    }

                    return (
                        <div key={desk.id} className="flex items-center justify-between p-4 border rounded-lg transition-colors" style={{ minHeight: deskCardHeight, height: deskCardHeight }}>
                          <div className="flex flex-col justify-center h-full">
                            <div className="flex items-center flex-wrap gap-y-1">
                                <h3 className="font-semibold">
                                  {desk.name || desk.desk_name || `Desk ${desk.id}`}
                                </h3>
                                {desk.requires_confirmation && (
                                  <span className="ml-2 px-2 py-0.5 rounded-md bg-[#C91E4A] text-white text-xs font-bold shadow-sm">
                                    Pico
                                  </span>
                                )}
                                {/* Render Badge */}
                                {availabilityBadge}
                            </div>
                          </div>
                          <Button variant="outline" onClick={() => makeReservation(desk.id)}>Reserve Desk</Button>
                        </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}