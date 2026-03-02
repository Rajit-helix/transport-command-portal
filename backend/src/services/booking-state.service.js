const transitions = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: []
};

export function assertBookingTransition(currentStatus, nextStatus) {
  const allowed = transitions[currentStatus] || [];
  return allowed.includes(nextStatus);
}
