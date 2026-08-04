const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const resolveWeekday = (
  selectedDay: string,
  selectedTime: string | null,
): Date => {
  const scheduledDate = new Date();
  const targetDay = (DAYS.indexOf(selectedDay) + 1) % 7;
  const daysAhead = (targetDay - scheduledDate.getDay() + 7) % 7 || 7;
  scheduledDate.setDate(scheduledDate.getDate() + daysAhead);
  if (selectedTime?.includes('8am')) scheduledDate.setHours(9, 0, 0);
  else if (selectedTime?.includes('12pm')) scheduledDate.setHours(14, 0, 0);
  else scheduledDate.setHours(18, 0, 0);
  return scheduledDate;
};
