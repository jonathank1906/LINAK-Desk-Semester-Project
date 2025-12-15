import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { STANDING_HEIGHT, SITTING_HEIGHT } from '../routes/Employee/MyDesk';
import { fetchPreferences, createPreference, updatePreference } from '../endpoints/preferences';

const PostureCycleContext = createContext();

const DEFAULT_SITTING_DURATION = 30; // minutes
const DEFAULT_STANDING_DURATION = 5; // minutes
const SIT_STAND_THRESHOLD = 95; // cm (matches backend)

export const PostureCycleProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentStance, setCurrentStance] = useState('sitting');
  const [showReminder, setShowReminder] = useState(false);
  const [preferences, setPreferences] = useState(null);
  
  // Initialize with defaults, will be overridden by API data when loaded
  const [postureCyclesEnabled, setPostureCyclesEnabled] = useState(true);
  const [sittingDuration, setSittingDuration] = useState(DEFAULT_SITTING_DURATION);
  const [standingDuration, setStandingDuration] = useState(DEFAULT_STANDING_DURATION);
  const [automaticMovement, setAutomaticMovement] = useState(false);
  const [pendingHeightChange, setPendingHeightChange] = useState(null);
  const [pendingHeightChangeIsAutomatic, setPendingHeightChangeIsAutomatic] = useState(false);
  const [hasActiveDesk, setHasActiveDesk] = useState(false);
  const [configuredStandingHeight, setConfiguredStandingHeight] = useState(STANDING_HEIGHT);
  const [configuredSittingHeight, setConfiguredSittingHeight] = useState(SITTING_HEIGHT);
  const intervalRef = useRef(null);
  const lastReminderTimeRef = useRef(Date.now());
  const navigateToMyDeskRef = useRef(null);
  const currentStanceRef = useRef(currentStance);
  const automaticMovementRef = useRef(automaticMovement);
  const configuredStandingHeightRef = useRef(STANDING_HEIGHT);
  const configuredSittingHeightRef = useRef(SITTING_HEIGHT);

  useEffect(() => {
    currentStanceRef.current = currentStance;
  }, [currentStance]);

  useEffect(() => {
    automaticMovementRef.current = automaticMovement;
  }, [automaticMovement]);

  useEffect(() => {
    configuredStandingHeightRef.current = configuredStandingHeight;
  }, [configuredStandingHeight]);

  useEffect(() => {
    configuredSittingHeightRef.current = configuredSittingHeight;
  }, [configuredSittingHeight]);

  // Fetch preferences from API on mount
  useEffect(() => {
    if (!user) {
      return;
    }

    const loadPreferences = async () => {
      try {
        const prefs = await fetchPreferences();
        const pref = prefs[0] || null;
        setPreferences(pref);
        
        if (pref) {

          setSittingDuration(pref.posture_sitting_duration ?? DEFAULT_SITTING_DURATION);
          setStandingDuration(pref.posture_standing_duration ?? DEFAULT_STANDING_DURATION);
          setAutomaticMovement(pref.posture_automatic_movement ?? false);
          setPostureCyclesEnabled(pref.enable_posture_cycles ?? true);
        } else {
          setSittingDuration(DEFAULT_SITTING_DURATION);
          setStandingDuration(DEFAULT_STANDING_DURATION);
          setAutomaticMovement(false);
          setPostureCyclesEnabled(true);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
        setSittingDuration(DEFAULT_SITTING_DURATION);
        setStandingDuration(DEFAULT_STANDING_DURATION);
        setAutomaticMovement(false);
        setPostureCyclesEnabled(true);
      }
    };

    loadPreferences();
  }, [user]);


  // Set up the reminder interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const isEmployee = user && !user.is_admin;
    if (isEmployee && postureCyclesEnabled && hasActiveDesk) {
      const duration = currentStance === 'sitting' ? sittingDuration : standingDuration;
      const intervalMs = duration * 60 * 1000;
      
      intervalRef.current = setInterval(() => {
        // If automatic movement is enabled, move desk automatically without showing reminder
        if (automaticMovementRef.current) {
          const nextStance = currentStanceRef.current === 'sitting' ? 'standing' : 'sitting';
          changeStanceAndSetDeskRef.current(nextStance, true); // true = isAutomatic
        } else {
          setShowReminder(true);
        }
        lastReminderTimeRef.current = Date.now();
      }, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [postureCyclesEnabled, hasActiveDesk, user, currentStance, sittingDuration, standingDuration, automaticMovement]);

  const handleStanceChange = (newStance) => {
    setCurrentStance(newStance);
    setShowReminder(false);
    lastReminderTimeRef.current = Date.now();
  };

  const triggerTestReminder = () => {
    setShowReminder(true);
  };

  const dismissReminder = () => {
    setShowReminder(false);
    lastReminderTimeRef.current = Date.now();
  };

  const disablePostureCycles = useCallback(async () => {
    setPostureCyclesEnabled(false);
    setShowReminder(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Save to database
    if (!user) return;

    try {
      const payload = { enable_posture_cycles: false };
      if (preferences?.id) {
        const updated = await updatePreference(preferences.id, payload);
        setPreferences(updated);
      } else {
        const created = await createPreference(payload);
        setPreferences(created);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [user, preferences]);

  const enablePostureCycles = useCallback(async () => {
    setPostureCyclesEnabled(true);
    
    // Save to database
    if (!user) return;

    try {
      const payload = { enable_posture_cycles: true };
      if (preferences?.id) {
        const updated = await updatePreference(preferences.id, payload);
        setPreferences(updated);
      } else {
        const created = await createPreference(payload);
        setPreferences(created);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [user, preferences]);

  const changeStanceAndSetDesk = useCallback((newStance, isAutomatic = false) => {
    setCurrentStance(newStance);
    setShowReminder(false);
    lastReminderTimeRef.current = Date.now();
    
    const targetHeight = newStance === 'standing' 
      ? configuredStandingHeightRef.current 
      : configuredSittingHeightRef.current;
    
    // Navigate to MyDesk page
    if (navigateToMyDeskRef.current) {
      navigateToMyDeskRef.current();
    }
    
    setPendingHeightChange({ height: targetHeight, timestamp: Date.now() });
    setPendingHeightChangeIsAutomatic(isAutomatic);
  }, []);

  //
  const changeStanceAndSetDeskRef = useRef(changeStanceAndSetDesk);
  useEffect(() => {
    changeStanceAndSetDeskRef.current = changeStanceAndSetDesk;
  }, [changeStanceAndSetDesk]);

  const registerCallbacks = useCallback((navigateCallback) => {
    navigateToMyDeskRef.current = navigateCallback;
  }, []);

  const setActiveDeskStatus = useCallback((hasDesk) => {
    setHasActiveDesk(hasDesk);
  }, []);

  // Update stance based on actual desk height
  const updateStanceFromHeight = useCallback((height) => {
    if (height === null || height === undefined) return;
    const newStance = height < SIT_STAND_THRESHOLD ? 'sitting' : 'standing';
    
    if (newStance !== currentStanceRef.current) {
      setCurrentStance(newStance);
      lastReminderTimeRef.current = Date.now();
      setShowReminder(false);
    }
  }, []);

  const updateConfiguredHeights = useCallback((standingHeight, sittingHeight) => {
    if (standingHeight !== undefined && standingHeight !== null) {
      setConfiguredStandingHeight(standingHeight);
    }
    if (sittingHeight !== undefined && sittingHeight !== null) {
      setConfiguredSittingHeight(sittingHeight);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings) => {
    if (newSettings.sittingDuration !== undefined) {
      setSittingDuration(newSettings.sittingDuration);
    }
    if (newSettings.standingDuration !== undefined) {
      setStandingDuration(newSettings.standingDuration);
    }
    if (newSettings.automaticMovement !== undefined) {
      setAutomaticMovement(newSettings.automaticMovement);
    }

    // Save to database
    if (!user) return;

    try {
      const payload = {};
      if (newSettings.sittingDuration !== undefined) {
        payload.posture_sitting_duration = newSettings.sittingDuration;
      }
      if (newSettings.standingDuration !== undefined) {
        payload.posture_standing_duration = newSettings.standingDuration;
      }
      if (newSettings.automaticMovement !== undefined) {
        payload.posture_automatic_movement = newSettings.automaticMovement;
      }

      if (Object.keys(payload).length > 0) {
        if (preferences?.id) {
          const updated = await updatePreference(preferences.id, payload);
          setPreferences(updated);
        } else {
          const created = await createPreference(payload);
          setPreferences(created);
        }
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [user, preferences]);

  const resetSettingsToDefaults = useCallback(async () => {
    setSittingDuration(DEFAULT_SITTING_DURATION);
    setStandingDuration(DEFAULT_STANDING_DURATION);
    setAutomaticMovement(false);

    // Save to database
    if (!user) return;

    try {
      const payload = {
        posture_sitting_duration: DEFAULT_SITTING_DURATION,
        posture_standing_duration: DEFAULT_STANDING_DURATION,
        posture_automatic_movement: false,
      };
      if (preferences?.id) {
        const updated = await updatePreference(preferences.id, payload);
        setPreferences(updated);
      } else {
        const created = await createPreference(payload);
        setPreferences(created);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [user, preferences]);

  const value = {
    currentStance,
    showReminder,
    postureCyclesEnabled,
    pendingHeightChange,
    pendingHeightChangeIsAutomatic,
    sittingDuration,
    standingDuration,
    automaticMovement,
    handleStanceChange,
    changeStanceAndSetDesk,
    triggerTestReminder,
    dismissReminder,
    disablePostureCycles,
    enablePostureCycles,
    registerCallbacks,
    setActiveDeskStatus,
    updateSettings,
    resetSettingsToDefaults,
    updateStanceFromHeight,
    updateConfiguredHeights,
  };

  return (
    <PostureCycleContext.Provider value={value}>
      {children}
    </PostureCycleContext.Provider>
  );
};

export const usePostureCycle = () => {
  const context = useContext(PostureCycleContext);
  if (context === undefined) {
    throw new Error('usePostureCycle must be used within a PostureCycleProvider');
  }
  return context;
};