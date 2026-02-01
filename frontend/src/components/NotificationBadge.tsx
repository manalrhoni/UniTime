import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Bell, Info, AlertTriangle } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'update';
  title: string;
  message: string;
  date: string;
}

interface NotificationBadgeProps {
  notifications: Notification[];
}

export function NotificationBadge({ notifications }: NotificationBadgeProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="space-y-3">
      {notifications.map(notification => (
        <Alert 
          key={notification.id}
          // On applique la classe générique qui sera stylisée par notifications.css
          className={`notification-alert alert-${notification.type}`}
        >
          {notification.type === 'warning' && (
            <AlertTriangle className="h-4 w-4" />
          )}
          {notification.type === 'update' && (
            <Bell className="h-4 w-4" />
          )}
          {notification.type === 'info' && (
            <Info className="h-4 w-4" />
          )}
          <AlertTitle className="flex items-center justify-between">
            <span data-title>{notification.title}</span>
            <Badge variant="outline" className="ml-2 text-xs badge-date">
              {new Date(notification.date).toLocaleDateString('fr-FR')}
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-sm" data-description>
            {notification.message}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}