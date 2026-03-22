import { createDocument, MODELS } from '../services/mongodb.js';

export const logActivity = async (userId, type, message, entityType, entityId, metadata = {}) => {
  try {
    await createDocument(MODELS.ACTIVITIES, {
      owner: userId,
      type,
      message,
      entityType,
      entityId,
      metadata
    });
  } catch (_error) {
    // Activity logging error intentionally silented to avoid disrupting main operations
  }
};

export const createActivityLogger = (type, entityType) => {
  return (message, entityId, metadata = {}) => {
    return (req, res, next) => {
      try {
        // Store activity data in request for post-processing
        req.activityData = {
          type,
          message,
          entityType,
          entityId: entityId || req.body.id || req.params.id,
          metadata
        };
        return next();
      } catch (_error) {
        return next();
      }
    };
  };
};

export const logActivityAfterResponse = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    // Log activity after successful response
    if (req.activityData && req.user && res.statusCode >= 200 && res.statusCode < 300) {
      setImmediate(() => {
        logActivity(
          req.user.userId,
          req.activityData.type,
          req.activityData.message,
          req.activityData.entityType,
          req.activityData.entityId,
          req.activityData.metadata
        );
      });
    }

    originalSend.call(this, data);
  };

  next();
};
