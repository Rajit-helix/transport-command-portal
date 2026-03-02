export const ROLE_ROUTES = {
  ADMIN: [
    { label: "Analytics", to: "/admin" },
    { label: "Audit Logs", to: "/admin/audit" },
    { label: "Manage Cities", to: "/manager/cities" }
  ],
  TRANSPORT_MANAGER: [
    { label: "Manager Dashboard", to: "/manager" },
    { label: "Manage Routes", to: "/manager/routes" },
    { label: "Manage Cities", to: "/manager/cities" },
    { label: "Manage Vehicles", to: "/manager/vehicles" },
    { label: "Manage Schedules", to: "/manager/schedules" },
    { label: "Assignments", to: "/manager/assignments" }
  ],
  DRIVER: [
    { label: "Driver Dashboard", to: "/driver" }
  ],
  CUSTOMER: [
    { label: "Browse Routes", to: "/customer/routes" },
    { label: "My Bookings", to: "/customer/bookings" }
  ]
};
