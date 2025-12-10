import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { STANDING_HEIGHT, SITTING_HEIGHT } from '../routes/Employee/MyDesk';

const PostureReminderContext = createContext();

const REMINDER_INTERVAL = 30 * 60 * 1000; // 30 minutes

export const PostureReminderProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentStance, setCurrentStance] = useState(() => {
    // Load from localStorage or default to 'sitting'
    return localStorage.getItem('posture_stance') || 'sitting';
  });
  const [showReminder, setShowReminder] = useState(false);
  const [remindersDisabled, setRemindersDisabled] = useState(() => {
    // Load from localStorage
    return localStorage.getItem('posture_reminders_disabled') === 'true';
  });
  const [pendingHeightChange, setPendingHeightChange] = useState(null);
  const [hasActiveDesk, setHasActiveDesk] = useState(false);
  const intervalRef = useRef(null);
  const lastReminderTimeRef = useRef(Date.now());
  const navigateToMyDeskRef = useRef(null);

  // Save stance to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('posture_stance', currentStance);
  }, [currentStance]);

  // Save reminders disabled state to localStorage
  useEffect(() => {
    localStorage.setItem('posture_reminders_disabled', remindersDisabled.toString());
  }, [remindersDisabled]);

  // Set up the reminder interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only set up if user is an employee (not admin), reminders are not disabled, and user has active desk
    const isEmployee = user && !user.is_admin;
    if (isEmployee && !remindersDisabled && hasActiveDesk) {
      intervalRef.current = setInterval(() => {
        setShowReminder(true);
        lastReminderTimeRef.current = Date.now();
      }, REMINDER_INTERVAL);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [remindersDisabled, hasActiveDesk, user]);

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

  const disableReminders = () => {
    setRemindersDisabled(true);
    setShowReminder(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const changeStanceAndSetDesk = (newStance) => {
    handleStanceChange(newStance);
    
    const targetHeight = newStance === 'standing' ? STANDING_HEIGHT : SITTING_HEIGHT;
    
    // Navigate to MyDesk page
    if (navigateToMyDeskRef.current) {
      navigateToMyDeskRef.current();
    }
    
    setPendingHeightChange({ height: targetHeight, timestamp: Date.now() });
  };

  const registerCallbacks = useCallback((navigateCallback) => {
    navigateToMyDeskRef.current = navigateCallback;
  }, []);

  const setActiveDeskStatus = useCallback((hasDesk) => {
    setHasActiveDesk(hasDesk);
  }, []);

  const value = {
    currentStance,
    showReminder,
    remindersDisabled,
    pendingHeightChange,
    handleStanceChange,
    changeStanceAndSetDesk,
    triggerTestReminder,
    dismissReminder,
    disableReminders,
    registerCallbacks,
    setActiveDeskStatus,
  };

  return (
    <PostureReminderContext.Provider value={value}>
      {children}
    </PostureReminderContext.Provider>
  );
};

export const usePostureReminder = () => {
  const context = useContext(PostureReminderContext);
  if (context === undefined) {
    throw new Error('usePostureReminder must be used within a PostureReminderProvider');
  }
  return context;
};