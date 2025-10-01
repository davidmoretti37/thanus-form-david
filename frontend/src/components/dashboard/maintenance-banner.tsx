'use client';

import { AlertCircle, X, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
import { t, type LanguageCode } from '@/lib/i18n';

interface MaintenanceBannerProps {
  startTime: string; // ISO string
  endTime: string; // ISO string
}

export function MaintenanceBanner({
  startTime,
  endTime,
}: MaintenanceBannerProps) {
  const [timeDisplay, setTimeDisplay] = useState<string>('');
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currentLang, setCurrentLang] = useState<LanguageCode>('en');

  // Initialize language
  useEffect(() => {
    const lang = (navigator.language.split('-')[0] as LanguageCode) || 'en';
    setCurrentLang(['en', 'pt', 'es'].includes(lang) ? lang as LanguageCode : 'en');
  }, []);

  // Create a unique key for this maintenance window
  const maintenanceKey = `maintenance-dismissed-${startTime}-${endTime}`;

  useEffect(() => {
    setIsMounted(true);
    // Check if this maintenance has been dismissed
    const dismissed = localStorage.getItem(maintenanceKey);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, [maintenanceKey]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const start = new Date(startTime);
      const end = new Date(endTime);

      // Check if maintenance is currently active
      if (now >= start && now <= end) {
        setIsMaintenanceActive(true);
        const diffToEnd = end.getTime() - now.getTime();

        if (diffToEnd <= 0) {
          setTimeDisplay(t('maintenance.completed', currentLang));
          return;
        }

        const hours = Math.floor(diffToEnd / (1000 * 60 * 60));
        const minutes = Math.floor(
          (diffToEnd % (1000 * 60 * 60)) / (1000 * 60),
        );

        if (hours > 0) {
          setTimeDisplay(
            t('maintenance.timeRemaining.hours', currentLang)
              .replace('{hours}', hours.toString())
              .replace('{minutes}', minutes.toString())
          );
        } else {
          setTimeDisplay(
            t('maintenance.timeRemaining.minutes', currentLang)
              .replace('{minutes}', minutes.toString())
          );
        }
      } else if (now < start) {
        // Maintenance hasn't started yet
        setIsMaintenanceActive(false);
        const diffToStart = start.getTime() - now.getTime();

        if (diffToStart <= 0) {
          setTimeDisplay(t('maintenance.startingNow', currentLang));
          return;
        }

        const days = Math.floor(diffToStart / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (diffToStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        const minutes = Math.floor(
          (diffToStart % (1000 * 60 * 60)) / (1000 * 60),
        );

        if (days > 0) {
          setTimeDisplay(
            t('maintenance.startingIn.days', currentLang)
              .replace('{days}', days.toString())
              .replace('{hours}', hours.toString())
          );
        } else if (hours > 0) {
          setTimeDisplay(
            t('maintenance.startingIn.hours', currentLang)
              .replace('{hours}', hours.toString())
              .replace('{minutes}', minutes.toString())
          );
        } else {
          setTimeDisplay(
            t('maintenance.startingIn.minutes', currentLang)
              .replace('{minutes}', minutes.toString())
          );
        }
      } else {
        // Maintenance is over
        setTimeDisplay('');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(maintenanceKey, 'true');
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    };
    
    // Format date according to the current language
    return date.toLocaleString(currentLang, options);
  };

  const getDuration = () => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return t('maintenance.duration.hours', currentLang)
        .replace('{hours}', hours.toString())
        .replace('{minutes}', minutes.toString());
    } else {
      return t('maintenance.duration.minutes', currentLang)
        .replace('{minutes}', minutes.toString());
    }
  };

  // Don't show banner if maintenance is over or dismissed
  const now = new Date();
  const end = new Date(endTime);

  // Don't render until mounted (SSR safety)
  if (!isMounted) {
    return null;
  }

  if (now > end || isDismissed) {
    return null;
  }

  return (
    <Alert
      className={`py-2 ${
        isMaintenanceActive
          ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'
          : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'
      }`}
    >
      <AlertCircle
        className={`h-4 w-4 ${
          isMaintenanceActive
            ? 'text-orange-600 dark:text-orange-400'
            : 'text-yellow-600 dark:text-yellow-400'
        }`}
      />
      <AlertDescription
        className={`flex items-center gap-2 ${
          isMaintenanceActive
            ? 'text-orange-700 dark:text-orange-300'
            : 'text-yellow-700 dark:text-yellow-300'
        }`}
      >
        <span className="font-medium">
          {isMaintenanceActive
            ? t('maintenance.banner.inProgress', currentLang)
            : t('maintenance.banner.scheduled', currentLang)}
        </span>
        {timeDisplay && (
          <>
            <span>•</span>
            <span>{timeDisplay}</span>
          </>
        )}

        {/* Info icon with tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 cursor-help opacity-60 hover:opacity-100 transition-opacity" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1 text-xs">
              {!isMaintenanceActive && (
                <div>{t('maintenance.starts', currentLang)}: {formatDateTime(startTime)}</div>
              )}
              <div>
                {isMaintenanceActive 
                  ? `${t('maintenance.expectedCompletion', currentLang)}: ${formatDateTime(endTime)}`
                  : `${t('maintenance.ends', currentLang)}: ${formatDateTime(endTime)}`}
              </div>
              <div>{t('maintenance.duration.label', currentLang)}: {getDuration()}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </AlertDescription>

      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="sm"
        className={`absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent ${
          isMaintenanceActive
            ? 'text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200'
            : 'text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200'
        }`}
        onClick={handleDismiss}
        aria-label={t('maintenance.dismiss', currentLang)}
      >
        <X className="h-3 w-3" />
      </Button>
    </Alert>
  );
}
