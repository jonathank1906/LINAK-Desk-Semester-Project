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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableDesks();
    }
  }, [selectedDate]);

  const fetchAvailableDesks = async () => {
    setLoading(true);
    try {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
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
    } finally {
      setLoading(false);
    }
  };

  const makeReservation = async (deskId) => {
    try {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
        withCredentials: true,
      };

      await axios.post(
        `http://localhost:8000/api/reservations/`,
        {
          desk_id: deskId,
          date: formattedDate,
        },
        config
      );

      toast.success("Reservation created!", {
        description: `Desk reserved for ${formattedDate}`,
      });

      // Refresh available desks
      fetchAvailableDesks();
    } catch (err) {
      console.error("Error making reservation:", err);
      toast.error("Failed to create reservation", {
        description: err.response?.data?.error || err.message,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Desk Reservations</h1>
        <p className="text-muted-foreground">
          Select a date to view and reserve available desks
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
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

        {/* Available Desks Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Available Desks for {selectedDate?.toLocaleDateString()}
            </CardTitle>
            <CardDescription>
              Click reserve to book a desk for the selected date
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : availableDesks.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No desks available for this date
              </p>
            ) : (
              <div className="space-y-3">
                {availableDesks.map((desk) => (
                  <div
                    key={desk.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div>
                      <h3 className="font-semibold">Desk {desk.id}</h3>
                      <p className="text-sm text-muted-foreground">
                        Location: {desk.location || "Building A"}
                      </p>
                    </div>
                    <Button onClick={() => makeReservation(desk.id)}>
                      Reserve
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}