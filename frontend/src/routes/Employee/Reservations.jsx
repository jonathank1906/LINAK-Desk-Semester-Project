import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import axios from "axios";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PendingVerificationModal from "@/components/pending-verification-modal";
import { useNavigate } from "react-router-dom";
import { formatTimeFromISO } from "@/utils/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Helper to get YYYY-MM-DD in LOCAL time
const formatLocalYYYYMMDD = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Reservations({ setSelectedDeskId }) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableDesks, setAvailableDesks] = useState([]);
  const [hotdeskStatus, setHotdeskStatus] = useState([]);
  const [userReservations, setUserReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("hotdesk");
  const [userHasActive, setUserHasActive] = useState(false);

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

  // Initialize start/end using helper so select's value always exists in options
  const defaultTimes = getDefaultTimesForDate(new Date());
  const [startTime, setStartTime] = useState(() => defaultTimes.start);
  const [endTime, setEndTime] = useState(() => defaultTimes.end);
  const [editingReservation, setEditingReservation] = useState(null);
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("17:00");

  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [pendingDeskId, setPendingDeskId] = useState(null);
  const [polling, setPolling] = useState(false);
  const nav = useNavigate();

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
    if (mode === "hotdesk") {
      fetchHotdeskStatus();
    } else if (mode === "reserve" && selectedDate) {
      fetchAvailableDesks();
      fetchUserReservations();
    } else {
      setAvailableDesks([]);
      setHotdeskStatus([]);
      setUserReservations([]);
      setLoading(false);
    }
  }, [selectedDate, startTime, endTime, mode]);

  useEffect(() => {
    let interval;
    if (polling && pendingDeskId) {
      interval = setInterval(async () => {
        try {
          const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
          const res = await axios.get(`http://localhost:8000/api/desks/${pendingDeskId}/`, config);
          if (res.data.current_status === "occupied") {
            setVerificationModalOpen(false);
            setPolling(false);
            toast.success("Desk confirmed!");
            if (setSelectedDeskId) setSelectedDeskId(pendingDeskId);
          }
          if (res.data.current_status === "available") {
            if (setSelectedDeskId) setSelectedDeskId(null);
          }
        } catch (err) {
           console.error("API error:", err);
         }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [polling, pendingDeskId, user, nav, setSelectedDeskId]);

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
    } catch (err) {  console.error("API error:", err);
      toast.error("Failed to fetch available desks", { description: err.response?.data?.error || err.message });
      setAvailableDesks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHotdeskStatus = async () => {
    setLoading(true);
    try {
      // FIXED: Was using toISOString() which causes Yesterday bug. Use helper.
      const today = formatLocalYYYYMMDD(new Date());

      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
      const response = await axios.get(`http://localhost:8000/api/desks/hotdesk_status/?date=${today}`, config);

      setHotdeskStatus(response.data);
      // refresh whether user currently has an active desk/reservation
      refreshUserActive();
    } catch (err) {
       console.error("API error:", err);
      toast.error("Failed to fetch hotdesk status");
      setHotdeskStatus([]);
    } finally {
      setLoading(false);
    }
  };

  // Check if the current user already has an active desk or active reservation
  async function refreshUserActive() {
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
      // check desks: user's own desk OR any occupied desk (for hotdesk-started desks)
      const desksRes = await axios.get(`http://localhost:8000/api/desks/`, config);
      const hasDesk = (desksRes.data || []).some(d => {
        const isOwnedByUser = d.current_user && String(d.current_user.id) === String(user?.id) && d.current_status !== 'available';
        const isOccupied = (d.current_status === 'occupied' || d.current_status === 'in_use') && d.current_status !== 'available';
        return isOwnedByUser || isOccupied;
      });
      if (hasDesk) {
        setUserHasActive(true);
        return;
      }
      // check reservations
      const res = await axios.get(`http://localhost:8000/api/reservations/`, config);
      const hasRes = (res.data || []).some(r => (r.status === 'active' || r.status === 'confirmed') && ((r.user_id && String(r.user_id) === String(user?.id)) || (r.user && ((typeof r.user === 'object' && r.user.id) || r.user) == user?.id)));
      setUserHasActive(hasRes);
    } catch (err) {
      console.warn('Could not determine if user has active desk/reservation:', err);
      // conservatively set false so we don't block unnecessarily on errors
      setUserHasActive(false);
    }
  }

  // Refresh userHasActive when component mounts or user changes
  useEffect(() => {
    if (user) {
      refreshUserActive();
    }
  }, [user]);

  const fetchUserReservations = async () => {
    try {
      const formattedDate = formatLocalYYYYMMDD(selectedDate);
      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
      const response = await axios.get(`http://localhost:8000/api/reservations/?date=${formattedDate}`, config);
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

      // FIXED: formattedDate is already a string. Do not call .toISOString() on it (Crash fix).
      // Also, send clean strings to API to avoid timezone shifting.
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
      console.error("Error making reservation:", err);
      toast.error("Failed to create reservation", { description: err.response?.data?.error || err.message });
    }
  };

  const handleEditReservation = async () => {
    if (!editingReservation) return;

    // FIXED: Use correct logic for edits
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
      fetchUserReservations();
      fetchAvailableDesks();
      window.dispatchEvent(new Event("reservation-updated"));

    } catch (err) { console.error("API error:", err);
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
    } catch (err) { console.error("API error:", err);
      toast.error("Failed to cancel reservation");
    }
  };

  const startHotDesk = async (deskId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };

      // If we already know user has an active desk/reservation, block immediately
      if (userHasActive) {
        toast.error('You already have an active desk or reservation. Release it before starting another.');
        return;
      }

      // Double-check on the server before starting
      try {
        const desksRes = await axios.get(`http://localhost:8000/api/desks/`, config);
        const existingDesk = (desksRes.data || []).find(d => d.current_user && String(d.current_user.id) === String(user?.id) && d.current_status !== 'available');
        if (existingDesk) {
          setUserHasActive(true);
          toast.error('You already have an active desk. Release it before starting another.');
          return;
        }
      } catch (err) {
        console.warn('Could not verify existing desks before starting hotdesk:', err);
      }

      try {
        const res = await axios.get(`http://localhost:8000/api/reservations/`, config);
        const hasActiveReservation = (res.data || []).some(r => (r.status === 'active' || r.status === 'confirmed') && ((r.user_id && String(r.user_id) === String(user?.id)) || (r.user && ((typeof r.user === 'object' && r.user.id) || r.user) == user?.id)));
        if (hasActiveReservation) {
          setUserHasActive(true);
          toast.error('You have an active reservation. Release or cancel it before starting a hotdesk.');
          return;
        }
      } catch (err) {
        console.warn('Could not verify reservations before starting hotdesk:', err);
      }

      const response = await axios.post(`http://localhost:8000/api/desks/${deskId}/hotdesk/start/`, {}, config);
      const { requires_confirmation } = response.data;

      if (requires_confirmation) {
        toast.success("Hot desk started! Please confirm at the desk.");
        setPendingDeskId(deskId);
        setVerificationModalOpen(true);
        setPolling(true);
      } else {
        toast.success("Hot desk started!");
        setSelectedDeskId(deskId);
        setUserHasActive(true); // Update state so subsequent Use clicks are blocked
        fetchHotdeskStatus();
        // Notify dashboard about the desk use
        window.dispatchEvent(new Event('reservation-updated'));
      }
    } catch (err) {
      toast.error("Failed to start hot desk", { description: err.response?.data?.error || err.message });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex rounded-md border overflow-hidden mt-2">
          <button
            type="button"
            aria-pressed={mode === "hotdesk"}
            onClick={() => setMode("hotdesk")}
            className={`px-4 py-2 focus:outline-none transition-colors ${mode === "hotdesk" ? "bg-primary text-white dark:text-black" : "bg-transparent text-muted-foreground"}`}
          >
            Hot Desk
          </button>
          <button
            type="button"
            aria-pressed={mode === "reserve"}
            onClick={() => setMode("reserve")}
            className={`px-4 py-2 focus:outline-none transition-colors ${mode === "reserve" ? "bg-primary text-white dark:text-black" : "bg-transparent text-muted-foreground"}`}
          >
            Reserve
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {mode === "hotdesk" ? (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Hot Desk Status</CardTitle>
              <CardDescription>See which desks are free right now.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">Loading...</p>
              ) : hotdeskStatus.length === 0 ? (
                <p className="text-center text-muted-foreground">No desk data available.</p>
              ) : (
                <div className="space-y-3">
                  {hotdeskStatus.map((desk) => {
                    const now = new Date();
                    const reservedStart = desk.reserved_start_time
                      ? new Date(desk.reserved_start_time)
                      : desk.reserved_time
                      ? new Date(desk.reserved_time)
                      : null;

                    const threshold = reservedStart
                      ? new Date(reservedStart.getTime() - 30 * 60 * 1000)
                      : null; // 30 minutes before reservation

                    const isOccupied = !!desk.occupied || (!!desk.current_status && desk.current_status === "occupied");
                    const isReserved = !!desk.reserved;
                    const isReserver = desk.reserved_by && user?.id && String(desk.reserved_by) === String(user.id);

                    let canUse = false;
                    if (isOccupied) {
                      canUse = false;
                    } else if (!isReserved) {
                      canUse = true;
                    } else if (isReserver) {
                      // Reserver can only use from threshold onwards
                      canUse = threshold ? now >= threshold : false;
                    } else {
                      // Other users can use until threshold
                      canUse = threshold ? now < threshold : true;
                    }

                    return (
                      <div
                        key={desk.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${desk.reserved ? "bg-yellow-50 border-yellow-300 dark:bg-yellow-900 dark:border-yellow-700" : "bg-green-50 border-green-300 dark:bg-slate-800 dark:border-slate-700"}`}
                      >
                        <div>
                          <h3 className="font-semibold">{desk.name || desk.desk_name || `Desk ${desk.id}`}</h3>
                          {desk.reserved ? (
                            isReserver ? (
                              <p className="text-sm text-blue-700 dark:text-blue-200">You have reserved this desk at {formatTimeFromISO(desk.reserved_time)}</p>
                            ) : (
                              <p className="text-sm text-yellow-700 dark:text-yellow-200">Warning: Reserved at {formatTimeFromISO(desk.reserved_time)}</p>
                            )
                          ) : (
                            <p className="text-sm text-green-700 dark:text-green-200">Free all day</p>
                          )}
                        </div>

                        {/* Action area */}
                        {isOccupied ? (
                          <span className="text-xs text-red-500">Desk is being used</span>
                        ) : isReserved ? (
                          isReserver ? (
                            // Reserver: show reserved message and instruction to check in via Employee Dashboard
                            <div>
                              <button className="px-3 py-1 rounded-md border text-sm text-muted-foreground" disabled>
                                Please check in 30 minutes before your reserve time starts
                              </button>
                            </div>
                          ) : canUse ? (
                            <Button variant="outline" onClick={() => startHotDesk(desk.id)} disabled={userHasActive} title={userHasActive ? 'You already have an active desk or reservation' : undefined}>Use</Button>
                          ) : (
                            <span className="text-xs text-red-500">Reserved — desk locked</span>
                          )
                        ) : (
                          <Button variant="outline" onClick={() => startHotDesk(desk.id)} disabled={userHasActive} title={userHasActive ? 'You already have an active desk or reservation' : undefined}>Use</Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
                <CardDescription>Choose a day to reserve a desk</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    const defaults = getDefaultTimesForDate(date);
                    setSelectedDate(date);
                    setStartTime(defaults.start);
                    setEndTime(defaults.end);
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                />

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

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Available Desks for {selectedDate?.toLocaleDateString()}</CardTitle>
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
                      <div key={desk.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                        <div>
                          <h3 className="font-semibold">{desk.name || desk.desk_name || `Desk ${desk.id}`}</h3>
                        </div>
                        <Button variant="outline" onClick={() => makeReservation(desk.id)}>Reserve</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Your Reservations for {selectedDate?.toLocaleDateString()}</CardTitle>
                <CardDescription>Manage your desk reservations</CardDescription>
              </CardHeader>
              <CardContent>
                {userReservations.length === 0 ? (
                  <p className="text-center text-muted-foreground">No reservations for this date.</p>
                ) : (
                  <div className="space-y-3">
                    {userReservations
                      .filter((r) => r.status === "confirmed" || r.status === "active")
                      .map((reservation) => (
                      <div key={reservation.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{reservation.desk_name || `Desk ${reservation.desk_id}`}</h3>
                          <p className="text-sm text-muted-foreground">
                            Reserved from {formatTimeFromISO(reservation.start_time) || "N/A"} to {formatTimeFromISO(reservation.end_time) || "N/A"}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <Button variant="outline" onClick={() => {
                            setEditingReservation(reservation);
                            setEditStartTime(formatTimeFromISO(reservation.start_time));
                            setEditEndTime(formatTimeFromISO(reservation.end_time));
                          }}>Edit</Button>

                          <Button variant="destructive" onClick={() => cancelReservation(reservation.id)}>Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <PendingVerificationModal open={verificationModalOpen} deskId={pendingDeskId} onClose={() => setVerificationModalOpen(false)} />

      {editingReservation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold">Edit Reservation</h3>
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
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingReservation(null)}>Cancel</Button>
              <Button onClick={() => handleEditReservation()}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}