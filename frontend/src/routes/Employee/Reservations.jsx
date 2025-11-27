import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import axios from "axios";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PendingVerificationModal from "@/components/pending-verification-modal";
import { useNavigate } from "react-router-dom";

// Accept setSelectedDeskId as a prop
export default function Reservations({ setSelectedDeskId }) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableDesks, setAvailableDesks] = useState([]);
  const [hotdeskStatus, setHotdeskStatus] = useState([]);
  const [userReservations, setUserReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("hotdesk"); // "hotdesk" or "reserve"
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [editingReservation, setEditingReservation] = useState(null);
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("17:00");



  // Pending verification modal state
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [pendingDeskId, setPendingDeskId] = useState(null);
  const [polling, setPolling] = useState(false);
  const nav = useNavigate();
  
function generateTimeOptions() {
  const options = [];
  for (let h = 6; h <= 22; h++) {
    const hour = h.toString().padStart(2, "0");
    options.push(`${hour}:00`);
    options.push(`${hour}:30`);
  }
  return options.map((time) => (
    <option key={time} value={time}>
      {time}
    </option>
  ));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, mode]);

  // Poll for confirmation and clear desk if released/cancelled
  useEffect(() => {
    let interval;
    if (polling && pendingDeskId) {
      interval = setInterval(async () => {
        try {
          const config = {
            headers: { Authorization: `Bearer ${user?.token}` },
            withCredentials: true,
          };
          const res = await axios.get(
            `http://localhost:8000/api/desks/${pendingDeskId}/`,
            config
          );
          if (res.data.current_status === "occupied") {
            setVerificationModalOpen(false);
            setPolling(false);
            toast.success("Desk confirmed!");
            if (setSelectedDeskId) setSelectedDeskId(pendingDeskId);
          }
          // If desk is released/cancelled, clear selection
          if (res.data.current_status === "available") {
            if (setSelectedDeskId) setSelectedDeskId(null);
          }
        } catch (err) {
          // Optionally handle error
        }
      }, 2000); // Poll every 2 seconds
    }
    return () => clearInterval(interval);
  }, [polling, pendingDeskId, user, nav, setSelectedDeskId]);

  const fetchAvailableDesks = async () => {
    setLoading(true);
    try {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` },
        withCredentials: true,
      };

      const response = await axios.get(
        `http://localhost:8000/api/desks/available/?date=${formattedDate}`,
        config
      );

      setAvailableDesks(response.data);
    } catch (err) {
      console.error("Error fetching available desks:", err);
      toast.error("Failed to fetch available desks", {
        description: err.response?.data?.error || err.message,
      });
      setAvailableDesks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch hotdesk status for today
  const fetchHotdeskStatus = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` },
        withCredentials: true,
      };

      // This endpoint should return all desks and their reservation status for today
      const response = await axios.get(
        `http://localhost:8000/api/desks/hotdesk_status/?date=${today}`,
        config
      );

      setHotdeskStatus(response.data);
    } catch (err) {
      console.error("Error fetching hotdesk status:", err);
      toast.error("Failed to fetch hotdesk status", {
        description: err.response?.data?.error || err.message,
      });
      setHotdeskStatus([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's reservations for the selected date
  const fetchUserReservations = async () => {
    try {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` },
        withCredentials: true,
      };

      const response = await axios.get(
        `http://localhost:8000/api/reservations/?date=${formattedDate}`,
        config
      );
      setUserReservations(response.data);
    } catch (err) {
      setUserReservations([]);
    }
  };

  const makeReservation = async (deskId) => {
    try {
      const formattedDate = selectedDate.toISOString().split("T")[0];
    // Combine selected date with time picker values
    const formattedStart = new Date(`${formattedDate}T${startTime}:00`);
    const formattedEnd = new Date(`${formattedDate}T${endTime}:00`);
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` },
        withCredentials: true,
      };

      await axios.post(
        `http://localhost:8000/api/reservations/create/`,
        {
         desk: deskId, //fix fetch
        start_time: formattedStart.toLocaleString("sv-SE"),
       end_time: formattedEnd.toLocaleString("sv-SE"),
        },
        config
      );

      if (formattedStart >= formattedEnd) {
      toast.error("Start time must be before end time");
      return;
    }


      toast.success("Reservation created!", {
        description: `Desk reserved for ${formattedDate}`,
      });

      fetchAvailableDesks();
      fetchUserReservations();
      window.dispatchEvent(new Event("reservation-updated"));
      // Do NOT setSelectedDeskId here; only after confirmation
    } catch (err) {
      console.error("Error making reservation:", err);
      toast.error("Failed to create reservation", {
        description: err.response?.data?.error || err.message,
      });
    }
  };

      const handleEditReservation = async () => {
      if (!editingReservation) return;

      const formattedDate = selectedDate.toISOString().split("T")[0];
      const newStart = new Date(`${formattedDate}T${editStartTime}:00`);
      const newEnd = new Date(`${formattedDate}T${editEndTime}:00`);

      if (newStart >= newEnd) {
        toast.error("Start time must be before end time");
        return;
      }

      try {
        const config = {
          headers: { Authorization: `Bearer ${user?.token}` },
          withCredentials: true,
        };

        await axios.patch(
          `http://localhost:8000/api/reservations/${editingReservation.id}/edit/`,
          {
            start_time: newStart.toLocaleString("sv-SE"),
            end_time: newEnd.toLocaleString("sv-SE"),
          },
          config
        );

        toast.success("Reservation updated!");
        setEditingReservation(null);
        fetchUserReservations();
        fetchAvailableDesks()
        window.dispatchEvent(new Event("reservation-updated"));

      } catch (err) {
        toast.error("Failed to update reservation", {
          description: err.response?.data?.error || err.message,
        });
      }
    };


  const cancelReservation = async (reservationId) => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` },
        withCredentials: true,
      };

      await axios.post(
        `http://localhost:8000/api/reservations/${reservationId}/cancel/`,
        {},
        config
      );

      toast.success("Reservation cancelled!");

        setUserReservations((prev) =>
      prev.filter((res) => res.id !== reservationId)
    );
      fetchUserReservations();
      fetchAvailableDesks();
      window.dispatchEvent(new Event("reservation-updated")); 
      // Clear selected desk if this was the active one
      if (setSelectedDeskId) setSelectedDeskId(null);
    } catch (err) {
      toast.error("Failed to cancel reservation", {
        description: err.response?.data?.error || err.message,
      });
    }
  };

  // Hotdesk flow with pending verification
  const startHotDesk = async (deskId) => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` },
        withCredentials: true,
      };

      // Send the request to start the hot desk
      const response = await axios.post(
        `http://localhost:8000/api/desks/${deskId}/hotdesk/start/`,
        {},
        config
      );

      const { requires_confirmation } = response.data;

      if (requires_confirmation) {
        // Show the modal if the desk requires confirmation
        toast.success("Hot desk started! Please confirm at the desk.");
        setPendingDeskId(deskId);
        setVerificationModalOpen(true);
        setPolling(true);
      } else {
        // Automatically confirm the desk if no Pico is required
        toast.success("Hot desk started!");
        setSelectedDeskId(deskId);
        fetchHotdeskStatus();
      }
    } catch (err) {
      toast.error("Failed to start hot desk", {
        description: err.response?.data?.error || err.message,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Toggle group centered at top */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-md border overflow-hidden mt-2">
          <button
            type="button"
            aria-pressed={mode === "hotdesk"}
            onClick={() => setMode("hotdesk")}
            className={`px-4 py-2 focus:outline-none transition-colors ${mode === "hotdesk" ? "bg-primary text-white" : "bg-transparent text-muted-foreground"
              }`}
          >
            Hot Desk
          </button>
          <button
            type="button"
            aria-pressed={mode === "reserve"}
            onClick={() => setMode("reserve")}
            className={`px-4 py-2 focus:outline-none transition-colors ${mode === "reserve" ? "bg-primary text-white" : "bg-transparent text-muted-foreground"
              }`}
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
              <CardDescription>
                See which desks are free right now.
              </CardDescription>
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
                      className={`flex items-center justify-between p-4 border rounded-lg ${desk.reserved
                          ? "bg-yellow-50 border-yellow-300"
                          : "bg-green-50 border-green-300"
                        }`}
                    >
                      <div>
                        <h3 className="font-semibold">{desk.name ? desk.name : desk.desk_name ? desk.desk_name : `Desk ${desk.id}`}</h3>
                        {desk.reserved ? (
                          <p className="text-sm text-yellow-700">
                            Warning: Reserved at {desk.reserved_time}
                          </p>
                        ) : (
                          <p className="text-sm text-green-700">Free all day</p>
                        )}
                      </div>
                      {!desk.reserved && (
                        <Button onClick={() => startHotDesk(desk.id)}>
                          Use
                        </Button>
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
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                />

                {/* Start Time Picker */}
                <div className="flex flex-col items-start w-full">
                  <label className="text-sm font-medium mb-1">Start Time</label>
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  >
                    {generateTimeOptions()}
                  </select>
                </div>

                {/* End Time Picker */}
                <div className="flex flex-col items-start w-full">
                  <label className="text-sm font-medium mb-1">End Time</label>
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  >
                    {generateTimeOptions()}
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  Available Desks for {selectedDate?.toLocaleDateString()}
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
                      <div
                        key={desk.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div>
                          <h3 className="font-semibold">{desk.name ? desk.name : desk.desk_name ? desk.desk_name : `Desk ${desk.id}`}</h3>
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
                      <div
                        key={reservation.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h3 className="font-semibold">Desk {reservation.desk_id}</h3>
                          <p className="text-sm text-muted-foreground">
                            Reserved from {reservation.start_time?.slice(11, 16) || "N/A"} to {reservation.end_time?.slice(11, 16) || "N/A"}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <Button variant="outline" onClick={() => {
                            setEditingReservation(reservation);
                            setEditStartTime(reservation.start_time?.slice(11, 16));
                            setEditEndTime(reservation.end_time?.slice(11, 16));
                          }}>
                            Edit
                          </Button>

                          <Button variant="destructive" onClick={() => cancelReservation(reservation.id)}>
                            Cancel
                          </Button>
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
      <PendingVerificationModal
        open={verificationModalOpen}
        deskId={pendingDeskId}
        onClose={() => setVerificationModalOpen(false)}
      />
      {editingReservation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md space-y-4">
              <h3 className="text-lg font-bold">Edit Reservation</h3>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Start Time</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                >
                  {generateTimeOptions()}
                </select>

                <label className="block text-sm font-medium">End Time</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                >
                  {generateTimeOptions()}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setEditingReservation(null)}
                >
                  Cancel
                </Button>
                <Button onClick={() => handleEditReservation()}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}