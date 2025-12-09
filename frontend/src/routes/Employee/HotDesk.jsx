import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PendingVerificationModal from "@/components/pending-verification-modal";
import { formatTimeFromISO } from "@/utils/date";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { Clock, LogOut } from "lucide-react";

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
  const [activeDeskId, setActiveDeskId] = useState(null);
  const [isOccupying, setIsOccupying] = useState(false); 
  
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [pendingDeskId, setPendingDeskId] = useState(null);
  const [polling, setPolling] = useState(false);
  const [selectingDeskId, setSelectingDeskId] = useState(null);
  const [selectingAnyDesk, setSelectingAnyDesk] = useState(false);
  const [releasing, setReleasing] = useState(false);

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

  async function refreshUserActive() {
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
      const desksRes = await axios.get(`http://localhost:8000/api/desks/`, config);
      
      const activeDesk = (desksRes.data || []).find(d => {
        const isOwnedByUser = d.current_user && String(d.current_user.id) === String(user?.id) && d.current_status !== 'available';
        const isOccupied = (d.current_status === 'occupied' || d.current_status === 'in_use' || d.current_status === 'pending_verification');
        return isOwnedByUser && isOccupied;
      });

      if (activeDesk) {
        setUserHasActive(true);
        setIsOccupying(true); 
        setActiveDeskId(activeDesk.id);
        return;
      }

      const res = await axios.get(`http://localhost:8000/api/reservations/`, config);
      const userRes = (res.data || []).find(r => (r.status === 'active' || r.status === 'confirmed') && ((r.user_id && String(r.user_id) === String(user?.id)) || (r.user && ((typeof r.user === 'object' && r.user.id) || r.user) == user?.id)));
      
      if (userRes) {
          setUserHasActive(true);
          setActiveDeskId(userRes.desk || userRes.desk_id);
          if (userRes.status === 'active') {
              setIsOccupying(true);
          } else {
              setIsOccupying(false); 
          }
      } else {
          setUserHasActive(false);
          setIsOccupying(false);
          setActiveDeskId(null);
      }

    } catch (err) {
      setUserHasActive(false);
      setIsOccupying(false);
      setActiveDeskId(null);
    }
  }

  useEffect(() => {
    if (user) {
      refreshUserActive();
    }
    // eslint-disable-next-line
  }, [user]);

  const handleReleaseActive = async () => {
      if (!activeDeskId) return;
      setReleasing(true);
      try {
          const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
          await axios.post(`http://localhost:8000/api/desks/${activeDeskId}/release/`, {}, config);
          
          toast.success("Desk released successfully");
          
          setUserHasActive(false);
          setIsOccupying(false);
          setActiveDeskId(null);
          if (setSelectedDeskId) setSelectedDeskId(null);
          
          fetchHotdeskStatus();
          window.dispatchEvent(new Event('reservation-updated'));
          
      } catch (err) {
          toast.error("Failed to release desk", { description: err.response?.data?.error || err.message });
      } finally {
          setReleasing(false);
      }
  };

  const startHotDesk = async (deskId) => {
    // 1. Frontend Check (Immediate feedback)
    if (userHasActive) {
        toast.error('You are already using a desk.', { description: "Please release your current desk before selecting a new one." });
        return;
    }

    setSelectingDeskId(deskId);
    setSelectingAnyDesk(true);
    
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` }, withCredentials: true };
      
      // 2. Call API (Backend Check will throw 400 if user has another desk)
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
        setIsOccupying(true);
        setActiveDeskId(deskId);
        fetchHotdeskStatus();
        window.dispatchEvent(new Event('reservation-updated'));
      }
    } catch (err) {
      // 3. Catch Backend Error (e.g., "You are already using Desk 1")
      toast.error("Failed to start hot desk", { description: err.response?.data?.error || err.message });
      // Refresh state to ensure button disables if backend says we have a desk
      refreshUserActive();
    } finally {
      setSelectingDeskId(null);
      setSelectingAnyDesk(false);
    }
  };

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

  const deskCardHeight = "80px"; 

  return (
    <div className="p-4 md:p-6 w-full">
      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle>Hot Desk</CardTitle>
            <CardDescription>See which desks are free right now</CardDescription>
          </div>
          
          {/* RELEASE BUTTON (Only shows if user is actively occupying a desk) */}
          {isOccupying && activeDeskId && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleReleaseActive}
                disabled={releasing}
                className="gap-2"
              >
                {releasing ? <Spinner className="w-4 h-4 text-white" /> : <LogOut className="w-4 h-4" />}
                Release Current Desk
              </Button>
          )}
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

                let availabilityBadge = null;
                if (!isOccupied && !isReserved) {
                    availabilityBadge = (
                        <span className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800">
                            Available all day
                        </span>
                    );
                } else if (!isOccupied && isReserved && !desk.locked_for_checkin && reservedStart) {
                    if (reservedStart > now) {
                        const timeStr = reservedStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        availabilityBadge = (
                            <span className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3 h-3" />
                                Available until {timeStr}
                            </span>
                        );
                    }
                }

                return (
                  <div
                    key={desk.id}
                    className={`flex items-center justify-between p-4 border rounded-lg`}
                    style={{ minHeight: deskCardHeight, height: deskCardHeight }}
                  >
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center flex-wrap gap-y-1">
                          <h3 className="font-semibold text-lg">
                            {desk.name || desk.desk_name || `Desk ${desk.id}`}
                          </h3>
                          {desk.requires_confirmation && (
                            <span className="ml-2 px-2 py-0.5 rounded-md bg-[#C91E4A] text-white text-xs font-bold shadow-sm">
                              Pico
                            </span>
                          )}
                          {availabilityBadge}
                      </div>

                      {desk.reserved ? (
                        isReserver ? (
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                            Reserved by you at {formatTimeFromISO(desk.reserved_time)}
                          </p>
                        ) : (
                          desk.locked_for_checkin ? (
                             <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                Reserved at {formatTimeFromISO(desk.reserved_time)}
                             </p>
                          ) : null
                        )
                      ) : null}
                    </div>

                    <div style={{ minWidth: "140px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isOccupied ? (
                        <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium text-sm">In Use</span>
                      ) : isReserved ? (
                        isReserver ? (
                          <button className="px-3 py-1 rounded-md border text-sm text-muted-foreground bg-muted/50" disabled style={{ width: "120px" }}>
                            Check-in soon
                          </button>
                        ) : (
                          desk.locked_for_checkin ? (
                             <span className="text-xs font-medium text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded" style={{ width: "120px", textAlign: "center" }}>
                                Reserved
                             </span>
                          ) : (
                             <Button
                                variant="outline"
                                onClick={() => startHotDesk(desk.id)}
                                // Disable if *you* are occupying another desk
                                disabled={userHasActive || selectingAnyDesk} 
                                style={{ width: "120px" }}
                              >
                                {renderButtonContent(desk.id)}
                              </Button>
                          )
                        )
                      ) : (
                        <Button
                            variant="outline"
                            onClick={() => startHotDesk(desk.id)}
                            // Disable if *you* are occupying another desk
                            disabled={userHasActive || selectingAnyDesk} 
                            style={{ width: "120px" }}
                          >
                            {renderButtonContent(desk.id)}
                        </Button>
                      )}
                    </div>
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