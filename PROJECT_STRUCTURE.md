# Project Structure

Community Food Wastage Reduction Portal — full monorepo layout.
`[x]` = written, `[ ]` = coming in a later stage of this build.

```
D:\Test
├── .gitignore                                   [x]
├── PROJECT_STRUCTURE.md                         [x]
├── README.md                                    [ ]  (stage 6)
│
├── server/                                      # Express + PostgreSQL (Neon) REST API
│   ├── package.json                             [x]
│   ├── .env.example                             [x]
│   ├── .env                                     (you create: cp .env.example .env)
│   ├── server.js                                [ ]  entry point (stage 3)
│   ├── app.js                                   [ ]  express app wiring (stage 3)
│   │
│   ├── sql/
│   │   ├── schema.sql                           [x]
│   │   └── seed.sql                             [x]
│   │
│   ├── scripts/
│   │   └── runSql.js                            [x]
│   │
│   ├── config/
│   │   ├── db.js                                [x]
│   │   └── jwt.js                               [x]
│   │
│   ├── middleware/
│   │   ├── auth.js                              [x]
│   │   ├── errorHandler.js                      [x]
│   │   ├── upload.js                            [x]
│   │   └── validate.js                          [x]
│   │
│   ├── utils/
│   │   ├── geo.js                               [x]
│   │   └── helpers.js                           [x]
│   │
│   ├── models/                                  [ ]  stage 2 (data access layer)
│   │   ├── userModel.js
│   │   ├── donationModel.js
│   │   ├── claimModel.js
│   │   ├── categoryModel.js
│   │   ├── notificationModel.js
│   │   ├── feedbackModel.js
│   │   └── verificationModel.js
│   │
│   ├── services/                                [ ]  stage 2
│   │   ├── authService.js
│   │   ├── donationService.js
│   │   ├── claimService.js
│   │   ├── notificationService.js
│   │   ├── emailService.js
│   │   ├── storageService.js
│   │   └── reportService.js
│   │
│   ├── controllers/                             [ ]  stage 3
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── donationController.js
│   │   ├── claimController.js
│   │   ├── notificationController.js
│   │   ├── feedbackController.js
│   │   ├── categoryController.js
│   │   └── adminController.js
│   │
│   ├── validators/                              [ ]  stage 3 (express-validator chains)
│   │   ├── authValidators.js
│   │   ├── donationValidators.js
│   │   └── adminValidators.js
│   │
│   ├── routes/                                  [ ]  stage 3
│   │   ├── index.js
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── donationRoutes.js
│   │   ├── claimRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── feedbackRoutes.js
│   │   ├── categoryRoutes.js
│   │   └── adminRoutes.js
│   │
│   └── uploads/                                 # runtime files (git-ignored)
│       ├── .gitkeep                             [x]
│       ├── donations/
│       ├── verifications/
│       ├── avatars/
│       └── deliveries/
│
└── client/                                      # React (Vite) + Tailwind
    ├── package.json                             [ ]
    ├── .env.example                             [x]
    ├── vite.config.js                           [ ]
    ├── tailwind.config.js                       [ ]
    ├── postcss.config.js                        [ ]
    ├── index.html                               [ ]
    │
    └── src/
        ├── main.jsx                             [ ]
        ├── App.jsx                              [ ]
        ├── index.css                            [ ]
        │
        ├── api/
        │   ├── axiosClient.js
        │   └── endpoints.js
        │
        ├── context/
        │   ├── AuthContext.jsx
        │   ├── NotificationContext.jsx
        │   └── ToastContext.jsx
        │
        ├── hooks/
        │   ├── useGeolocation.js
        │   ├── useDebounce.js
        │   └── useFetch.js
        │
        ├── components/
        │   ├── layout/  (Navbar, Sidebar, Footer, Layout)
        │   ├── common/  (Button, Input, Select, Modal, Badge, Spinner,
        │   │             EmptyState, ErrorState, Pagination, StarRating,
        │   │             ProtectedRoute, StatusBadge)
        │   ├── donations/ (DonationCard, DonationForm, DonationFilters,
        │   │               ImageGallery, StatusTimeline)
        │   ├── map/     (DonationsMap, LocationPicker)
        │   └── notifications/ (NotificationBell, NotificationList)
        │
        ├── pages/
        │   ├── public/   (LandingPage, LoginPage, RegisterPage, NotFoundPage)
        │   ├── donor/    (DonorDashboard, MyDonations, DonationCreate,
        │   │              DonationEdit, DonationDetail, DonorFeedback)
        │   ├── recipient/ (RecipientDashboard, BrowseDonations, DonationMap,
        │   │               MyClaims, ClaimDetail, FeedbackForm)
        │   ├── admin/    (AdminDashboard, AdminUsers, AdminVerifications,
        │   │              AdminDonations, AdminCategories, AdminReports)
        │   └── shared/   (ProfilePage, NotificationsPage)
        │
        └── utils/
            ├── formatters.js
            ├── constants.js
            └── validators.js
```

## Status lifecycle

```
              donor creates listing
                       |
                       v
 [AVAILABLE] ------> [CLAIMED] ------> [DELIVERED]
      |                  |                  |
      |                  |                  +-> recipient rates donor (feedback)
      |                  +-> emails donor + recipient, dashboard notifications
      +-> donor may CANCEL, or it auto-hides once best_before passes
```

Every transition writes a row into `status_history` (who, when, note).

## Stage plan for this build

1. **Stage 1** – database schema + seed, server foundation (config, middleware, utils, env). *(done)*
2. **Stage 2** – server models + services (auth, donations, claims, notifications, email, reports).
3. **Stage 3** – server controllers, validators, routes, `app.js`, `server.js`.
4. **Stage 4** – client scaffold (Vite, Tailwind, router, axios, auth context, layout).
5. **Stage 5** – donor + recipient pages (dashboards, listing form, map/search, claims, feedback).
6. **Stage 6** – admin pages, notification UI, charts, README + run instructions.
