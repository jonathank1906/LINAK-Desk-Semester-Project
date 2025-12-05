import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import axios from "axios";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
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

// Helper to get YYYY-MM-DD in LOCAL time
const formatLocalYYYYMMDD = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Date formatting helpers for the date picker
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
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [editingReservation, setEditingReservation] = useState(null);
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("17:00");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const nav = useNavigate();

  // Date picker state
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(selectedDate);
  const [datePickerValue, setDatePickerValue] = useState(formatDate(selectedDate));

  // Helper: round up to next interval (default 30 minutes)
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

  // Returns default start/end times for a given date.
  // If the date is today, start is next available 30-min slot (rounded up), end = start + 30min.
  // Otherwise defaults to 09:00 - 17:00.
  function getDefaultTimesForDate(date) {
    if (!date) return { start: "09:00", end: "17:00" };
    const now = new Date();
    const target = new Date(date);
    if (target.toDateString() === now.toDateString()) {
      let start = roundUpToNextInterval(now, 30);
      // clamp earliest start to 06:00
      if (start.getHours() < 6) start = new Date(target.setHours(6, 0, 0, 0));
      // clamp latest start to 22:00
      if (start.getHours() > 22) start = new Date(target.setHours(22, 0, 0, 0));
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      return { start: formatHHMM(start), end: formatHHMM(end) };
    }
    return { start: "09:00", end: "17:00" };
  }

  // Helper to generate SelectItem components for time options
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
      toast.error("Failed to fetch available desks", { description: err.response?.data?.error || err.message });
      setAvailableDesks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReservations = async () => {
    try {
      // Fetch ALL reservations for the user, not just for the selected date
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
      toast.error("Failed to update reservation", { description: err.response?.data?.error || err.message });
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

  // Date picker change handler
  const handleDatePickerChange = (date) => {
    setSelectedDate(date);
    setDatePickerMonth(date);
    setDatePickerValue(formatDate(date));
    const defaults = getDefaultTimesForDate(date);
    setStartTime(defaults.start);
    setEndTime(defaults.end);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* My Reservations - full width */}
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Your Reservations</CardTitle>
          <CardDescription>Manage all your desk reservations</CardDescription>
        </CardHeader>
        <CardContent>
          {userReservations.length === 0 ? (
            <p className="text-center text-muted-foreground">No reservations found.</p>
          ) : (
            <div className="space-y-3">
              {userReservations
                .filter((r) => r.status === "confirmed" || r.status === "active")
                .map((reservation) => (
                  <div key={reservation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{reservation.desk_name || `Desk ${reservation.desk_id}`}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(reservation.start_time).toLocaleDateString()}<br />
                        Reserved from {formatTimeFromISO(reservation.start_time) || "N/A"} to {formatTimeFromISO(reservation.end_time) || "N/A"}
                      </p>
                    </div>
                    <div className="space-x-2">
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
                          <div className="space-y-4">
                            <div className="space-y-2">
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
                            <div className="space-y-2">
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
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky Filters Card and Desk List */}
      <div className="relative flex flex-col lg:flex-row gap-6">
        {/* Sticky Filters Card */}
        <div className="lg:w-1/3 w-full lg:sticky lg:top-6 z-40 h-fit">
          <Card>
            <CardHeader>
              <CardTitle>Reservation Filters</CardTitle>
              <CardDescription>Select date and time to find available desks</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Date Picker */}
              <div className="flex flex-col gap-3 w-full">
                <Label htmlFor="date" className="px-1">
                  Reservation Date
                </Label>
                <div className="relative flex gap-2">
                  <Input
                    id="date"
                    value={datePickerValue}
                    placeholder="June 01, 2025"
                    className="bg-background pr-10"
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      setDatePickerValue(e.target.value);
                      if (isValidDate(date)) {
                        handleDatePickerChange(date);
                      }
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
                      <Button
                        id="date-picker"
                        variant="ghost"
                        className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                      >
                        <CalendarIcon className="size-3.5" />
                        <span className="sr-only">Select date</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto overflow-hidden p-0"
                      align="end"
                      alignOffset={-8}
                      sideOffset={10}
                    >
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

              <div className="flex flex-col items-start w-full">
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

              <div className="flex flex-col items-start w-full">
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
                <p className="text-center text-muted-foreground">Loading...</p>
              ) : availableDesks.length === 0 ? (
                <p className="text-center text-muted-foreground">No desks available for this date</p>
              ) : (
                <div className="space-y-3">
                  {availableDesks.map((desk) => (
                    <div key={desk.id} className="flex items-center justify-between p-4 border rounded-lg transition-colors">
                      <div>
                        <h3 className="font-semibold">{desk.name || desk.desk_name || `Desk ${desk.id}`}</h3>
                      </div>
                      <Button variant="outline" onClick={() => makeReservation(desk.id)}>Reserve Desk</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}