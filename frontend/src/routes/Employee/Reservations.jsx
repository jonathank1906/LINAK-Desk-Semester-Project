import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import axios from "axios";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PendingVerificationModal from "@/components/pending-verification-modal";
import { useNavigate } from "react-router-dom";

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
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [editingReservation, setEditingReservation] = useState(null);
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("17:00");

  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [pendingDeskId, setPendingDeskId] = useState(null);
  const [polling, setPolling] = useState(false);
  const nav = useNavigate();
  
  function generateTimeOptions(selectedDate, startFrom = "06:00", minInterval = 0) {
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
      options.push(<option key={label} value={label}>{label}</option>);
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
    } catch (err) {
       console.error("API error:", err);
      toast.error("Failed to fetch hotdesk status");
      setHotdeskStatus([]);
    } finally {
      setLoading(false);
    }
  };

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

      toast.success("Reservation cancelled!");
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
        fetchHotdeskStatus();
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
            className={`px-4 py-2 focus:outline-none transition-colors ${mode === "hotdesk" ? "bg-primary text-white" : "bg-transparent text-muted-foreground"}`}
          >
            Hot Desk
          </button>
          <button
            type="button"
            aria-pressed={mode === "reserve"}
            onClick={() => setMode("reserve")}
            className={`px-4 py-2 focus:outline-none transition-colors ${mode === "reserve" ? "bg-primary text-white" : "bg-transparent text-muted-foreground"}`}
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
                  {hotdeskStatus.map((desk) => (
                    <div
                      key={desk.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${desk.reserved ? "bg-yellow-50 border-yellow-300" : "bg-green-50 border-green-300"}`}
                    >
                      <div>
                        <h3 className="font-semibold">{desk.name || desk.desk_name || `Desk ${desk.id}`}</h3>
                        {desk.reserved ? (
                          // FIXED: Converted to String for comparison (Warning Bug)
                          String(desk.reserved_by) === String(user?.id) ? (
                            <p className="text-sm text-blue-700">You have reserved this desk at {desk.reserved_time}</p>
                          ) : (
                            <p className="text-sm text-yellow-700">Warning: Reserved at {desk.reserved_time}</p>
                          )
                        ) : (
                          <p className="text-sm text-green-700">Free all day</p>
                        )}
                      </div>
                      {desk.locked_for_checkin ? (
                        String(desk.reserved_by) === String(user?.id) ? (
                          // If the current user is pending verification, show a waiting status
                          <span className="text-xs text-blue-500 font-medium">Verification Pending...</span>
                        ) : (
                          // If someone else is locking it (via reservation or hot desk)
                          <span className="text-xs text-red-500">Reserved — desk locked</span>
                        )
                      ) : (
                        <Button onClick={() => startHotDesk(desk.id)}>Use</Button>
                      )}
                    </div>
                  ))}
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
                    setSelectedDate(date);
                    setStartTime("09:00");
                    setEndTime("17:00");
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                />

                <div className="flex flex-col items-start w-full">
                  <label className="text-sm font-medium mb-1">Start Time</label>
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={startTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartTime(newStart);
                      const [h, m] = newStart.split(":").map(Number);
                      const endDate = new Date();
                      endDate.setHours(h);
                      endDate.setMinutes(m + 30); 
                      const nextEnd = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes() < 30 ? "00" : "30"}`;
                      if (endTime <= newStart) setEndTime(nextEnd); 
                    }}
                  >
                    {generateTimeOptions(selectedDate)}
                  </select>
                </div>

                <div className="flex flex-col items-start w-full">
                  <label className="text-sm font-medium mb-1">End Time</label>
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  >
                    {generateTimeOptions(selectedDate, startTime, 30)}
                  </select>
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
                          <p className="text-sm text-muted-foreground">Location: {desk.location || "Building A"}</p>
                        </div>
                        <Button onClick={() => makeReservation(desk.id)}>Reserve</Button>
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
                            Reserved from {reservation.start_time?.slice(11, 16) || "N/A"} to {reservation.end_time?.slice(11, 16) || "N/A"}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <Button variant="outline" onClick={() => {
                            setEditingReservation(reservation);
                            setEditStartTime(reservation.start_time?.slice(11, 16));
                            setEditEndTime(reservation.end_time?.slice(11, 16));
                          }}>Edit</Button>

                          <Button variant="destructive" onClick={() => cancelReservation(reservation.id)}>Cancel</Button>
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
                <select
                  className="w-full border rounded px-2 py-1"
                  value={editStartTime}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    // **FIX**: Was updating main setStartTime, changed to setEditStartTime
                    setEditStartTime(newStart); 
                  }}
                >
                   {generateTimeOptions(selectedDate, "06:00", 0)}
                </select>

                <label className="block text-sm font-medium">End Time</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                >
                  // **FIX**: Changed startTime to editStartTime for options generation
                  {generateTimeOptions(selectedDate, editStartTime, 30)}
                </select>
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