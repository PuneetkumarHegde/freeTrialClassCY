import { Router } from 'express';
import { healthRouter } from './health.routes';
import { mentorRouter } from './mentor.routes';
import { schedulingRouter } from './scheduling.routes';
import { bookingRouter } from './booking.routes';
import { authRouter } from './auth.routes';
import { parentRouter } from './parent.routes';
import { mentorPortalRouter } from './mentor-portal.routes';
import { adminRouter } from './admin.routes';

export const apiRouter = Router();

// Mount health routes at /api/health
apiRouter.use(healthRouter);

// Mount mentor public routes at /api/mentors...
apiRouter.use(mentorRouter);

// Mount scheduling routes at /api/scheduling/slots...
apiRouter.use(schedulingRouter);

// Mount booking routes at /api/bookings
apiRouter.use(bookingRouter);

// Mount authentication routes at /api/auth...
apiRouter.use(authRouter);

// Mount parent protected routes at /api/parent...
apiRouter.use(parentRouter);

// Mount mentor portal protected routes at /api/mentor...
apiRouter.use(mentorPortalRouter);

// Mount admin protected routes at /api/admin...
apiRouter.use(adminRouter);

