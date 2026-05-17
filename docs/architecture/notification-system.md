# Notification System

## Overview

Juriq has a multi-channel notification system for hearing reminders, case updates, payment alerts, and system announcements.

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Alert` model | `backend/src/models/Alert.js` | Persistent alert records |
| `AlertQueue` model | `backend/src/models/AlertQueue.js` | Queued alerts pending delivery |
| `alertQueueService.js` | `backend/src/services/` | Alert scheduling and processing |
| `notificationService.js` | `backend/src/services/` | Multi-channel delivery |
| `emailWorker.js` | `backend/src/workers/` | Async email delivery via BullMQ |
| `AlertManager.tsx` | `frontend/src/components/` | Alert display component |
| `NotificationDropdown.tsx` | `frontend/src/components/layout/` | Header notification bell |

## Notification Types

- Hearing reminders (upcoming court dates)
- Case status changes
- Payment confirmations
- Subscription alerts (expiry, renewal, failure)
- System announcements

## Delivery Channels

1. **In-app**: Real-time alerts via API polling (NotificationDropdown)
2. **Email**: Async delivery via BullMQ email queue
3. **Future**: WhatsApp, SMS, Push notifications
