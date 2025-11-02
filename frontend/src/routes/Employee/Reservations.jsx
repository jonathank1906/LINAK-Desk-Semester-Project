import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import axios from "axios";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Reservations() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableDesks, setAvailableDesks] = useState([]);
  const [hotdeskStatus, setHotdeskStatus] = useState([]);
  const [userReservations, setUserReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("hotdesk"); // "hotdesk" or "reserve"

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
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` },
        withCredentials: true,
      };

      await axios.post(
        `http://localhost:8000/api/reservations/create/`,
        {
          desk_id: deskId,
          date: formattedDate,
        },
        config
      );

      toast.success("Reservation created!", {
        description: `Desk reserved for ${formattedDate}`,
      });

      fetchAvailableDesks();
      fetchUserReservations();
    } catch (err) {
      console.error("Error making reservation:", err);
      toast.error("Failed to create reservation", {
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
        `http://localhost:8000/api/reservations/${reservationId}/check_out/`,
        {},
        config
      );

      toast.success("Reservation cancelled!");
      fetchUserReservations();
      fetchAvailableDesks();
    } catch (err) {
      toast.error("Failed to cancel reservation", {
        description: err.response?.data?.error || err.message,
      });
    }
  };

  const startHotDesk = async (deskId) => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${user?.token}` },
        withCredentials: true,
      };
      await axios.post(
        `http://localhost:8000/api/desks/${deskId}/hotdesk/start/`,
        {},
        config
      );
      toast.success("Hot desk started!");
      fetchHotdeskStatus();
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
            className={`px-4 py-2 focus:outline-none transition-colors ${
              mode === "hotdesk" ? "bg-primary text-white" : "bg-transparent text-muted-foreground"
            }`}
          >
            Hot Desk
          </button>
          <button
            type="button"
            aria-pressed={mode === "reserve"}
            onClick={() => setMode("reserve")}
            className={`px-4 py-2 focus:outline-none transition-colors ${
              mode === "reserve" ? "bg-primary text-white" : "bg-transparent text-muted-foreground"
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
                See which desks are free or reserved today.
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
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        desk.reserved
                          ? "bg-yellow-50 border-yellow-300"
                          : "bg-green-50 border-green-300"
                      }`}
                    >
                      <div>
                        <h3 className="font-semibold">Desk {desk.id}</h3>
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
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                />
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
                          <h3 className="font-semibold">Desk {desk.id}</h3>
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
                    {userReservations.map((reservation) => (
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
                        <Button variant="destructive" onClick={() => cancelReservation(reservation.id)}>
                          Cancel
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}