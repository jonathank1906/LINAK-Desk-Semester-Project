import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PendingVerificationModal from "@/components/pending-verification-modal";
import { formatTimeFromISO } from "@/utils/date";
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

export default function HotDesk({ setSelectedDeskId }) {
  const { user } = useAuth();
  const [hotdeskStatus, setHotdeskStatus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userHasActive, setUserHasActive] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [pendingDeskId, setPendingDeskId] = useState(null);
  const [polling, setPolling] = useState(false);
  const [selectingDeskId, setSelectingDeskId] = useState(null);
  const [selectingAnyDesk, setSelectingAnyDesk] = useState(false);

  useEffect(() => {
    fetchHotdeskStatus();
    // eslint-disable-next-line
  }, []);

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
  }, [polling, pendingDeskId, user, setSelectedDeskId]);

  const fetchHotdeskStatus = async () => {
    setLoading(true);
    try {
      const today = formatLocalYYYYMMDD(new Date());
      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
      const response = await axios.get(`http://localhost:8000/api/desks/hotdesk_status/?date=${today}`, config);

      setHotdeskStatus(response.data);
      refreshUserActive();
    } catch (err) {
      console.error("API error:", err);
      toast.error("Failed to fetch hot desk status");
      setHotdeskStatus([]);
    } finally {
      setLoading(false);
    }
  };

  // Check if the current user already has an active desk or active reservation
  async function refreshUserActive() {
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
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
      const res = await axios.get(`http://localhost:8000/api/reservations/`, config);
      const hasRes = (res.data || []).some(r => (r.status === 'active' || r.status === 'confirmed') && ((r.user_id && String(r.user_id) === String(user?.id)) || (r.user && ((typeof r.user === 'object' && r.user.id) || r.user) == user?.id)));
      setUserHasActive(hasRes);
    } catch (err) {
      setUserHasActive(false);
    }
  }

  useEffect(() => {
    if (user) {
      refreshUserActive();
    }
    // eslint-disable-next-line
  }, [user]);

  const startHotDesk = async (deskId) => {
    setSelectingDeskId(deskId);
    setSelectingAnyDesk(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };

      if (userHasActive) {
        toast.error('You already have an active desk or reservation. Release it before starting another.');
        setSelectingDeskId(null);
        setSelectingAnyDesk(false);
        return;
      }

      try {
        const desksRes = await axios.get(`http://localhost:8000/api/desks/`, config);
        const existingDesk = (desksRes.data || []).find(d => d.current_user && String(d.current_user.id) === String(user?.id) && d.current_status !== 'available');
        if (existingDesk) {
          setUserHasActive(true);
          toast.error('You already have an active desk. Release it before starting another.');
          setSelectingDeskId(null);
          setSelectingAnyDesk(false);
          return;
        }
      } catch (err) {
        // ignore
      }

      try {
        const res = await axios.get(`http://localhost:8000/api/reservations/`, config);
        const hasActiveReservation = (res.data || []).some(r => (r.status === 'active' || r.status === 'confirmed') && ((r.user_id && String(r.user_id) === String(user?.id)) || (r.user && ((typeof r.user === 'object' && r.user.id) || r.user) == user?.id)));
        if (hasActiveReservation) {
          setUserHasActive(true);
          toast.error('You have an active reservation. Release or cancel it before starting a hotdesk.');
          setSelectingDeskId(null);
          setSelectingAnyDesk(false);
          return;
        }
      } catch (err) {
        // ignore
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
        setUserHasActive(true);
        fetchHotdeskStatus();
        window.dispatchEvent(new Event('reservation-updated'));
      }
    } catch (err) {
      toast.error("Failed to start hot desk", { description: err.response?.data?.error || err.message });
    } finally {
      setSelectingDeskId(null);
      setSelectingAnyDesk(false);
    }
  };

  // Button content helper to keep button width fixed
  const renderButtonContent = (deskId) => {
    const buttonText = "Select Desk";
    if (selectingDeskId === deskId && selectingAnyDesk) {
      return (
        <span style={{ display: "inline-block", width: `${buttonText.length * 0.6}em`, textAlign: "center" }}>
          <Spinner variant="circle" className="h-4 w-4 mx-auto" />
        </span>
      );
    }
    return (
      <span style={{ display: "inline-block", width: `${buttonText.length * 0.6}em`, textAlign: "center" }}>
        {buttonText}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 w-full">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Hot Desk</CardTitle>
          <CardDescription>See which desks are free right now</CardDescription>
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
                  : null;

                const isOccupied = !!desk.occupied || (!!desk.current_status && desk.current_status === "occupied");
                const isReserved = !!desk.reserved;
                const isReserver = desk.reserved_by && user?.id && String(desk.reserved_by) === String(user.id);

                let canUse = false;
                if (isOccupied) {
                  canUse = false;
                } else if (!isReserved) {
                  canUse = true;
                } else if (isReserver) {
                  canUse = threshold ? now >= threshold : false;
                } else {
                  canUse = threshold ? now < threshold : true;
                }

                return (
                  <div
                    key={desk.id}
                    className={`flex items-center justify-between p-4 border rounded-lg`}
                  >
                    <div>
                      <h3 className="font-semibold">{desk.name || desk.desk_name || `Desk ${desk.id}`}</h3>
                      {desk.reserved ? (
                        isReserver ? (
                          <p className="text-sm text-blue-700 dark:text-blue-200">You have reserved this desk at {formatTimeFromISO(desk.reserved_time)}</p>
                        ) : (
                          <p className="text-sm text-yellow-700 dark:text-yellow-200">Warning: Reserved at {formatTimeFromISO(desk.reserved_time)}</p>
                        )
                      ) : null}
                    </div>

                    {isOccupied ? (
                      <span className="text-xs text-red-500">Desk is being used</span>
                    ) : isReserved ? (
                      isReserver ? (
                        <div>
                          <button className="px-3 py-1 rounded-md border text-sm text-muted-foreground" disabled>
                            Please check in 30 minutes before your reserve time starts
                          </button>
                        </div>
                      ) : canUse ? (
                        <Button
                          variant="outline"
                          onClick={() => startHotDesk(desk.id)}
                          disabled={userHasActive || selectingAnyDesk}
                          title={userHasActive ? 'You already have an active desk or reservation' : undefined}
                        >
                          {renderButtonContent(desk.id)}
                        </Button>
                      ) : (
                        <span className="text-xs text-red-500">Reserved — desk locked</span>
                      )
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => startHotDesk(desk.id)}
                        disabled={userHasActive || selectingAnyDesk}
                        title={userHasActive ? 'You already have an active desk or reservation' : undefined}
                      >
                        {renderButtonContent(desk.id)}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        <PendingVerificationModal open={verificationModalOpen} deskId={pendingDeskId} onClose={() => setVerificationModalOpen(false)} />
      </Card>
    </div>
  );
}