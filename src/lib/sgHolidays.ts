export interface SgHoliday {
  date: string; // yyyy-mm-dd
  name: string;
}

// Officially gazetted by the Ministry of Manpower (mom.gov.sg). Lunar/Islamic/Hindu-calendar
// holidays (CNY, Hari Raya Puasa, Hari Raya Haji, Vesak Day, Deepavali) shift every year and
// can't be computed — MOM publishes each year's list roughly a year or more in advance, so
// only years with a confirmed gazette are listed here. "(in lieu)" marks the Monday observed
// when the actual holiday falls on a Sunday.
export const SG_HOLIDAYS: SgHoliday[] = [
  // 2025
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-01-29', name: 'Chinese New Year' },
  { date: '2025-01-30', name: 'Chinese New Year' },
  { date: '2025-03-31', name: 'Hari Raya Puasa' },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-05-01', name: 'Labour Day' },
  { date: '2025-05-12', name: 'Vesak Day' },
  { date: '2025-06-07', name: 'Hari Raya Haji' },
  { date: '2025-08-09', name: 'National Day' },
  { date: '2025-10-20', name: 'Deepavali' },
  { date: '2025-12-25', name: 'Christmas Day' },
  // 2026
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-02-17', name: 'Chinese New Year' },
  { date: '2026-02-18', name: 'Chinese New Year' },
  { date: '2026-03-21', name: 'Hari Raya Puasa' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-27', name: 'Hari Raya Haji' },
  { date: '2026-05-31', name: 'Vesak Day' },
  { date: '2026-06-01', name: 'Vesak Day (in lieu)' },
  { date: '2026-08-09', name: 'National Day' },
  { date: '2026-08-10', name: 'National Day (in lieu)' },
  { date: '2026-11-08', name: 'Deepavali' },
  { date: '2026-11-09', name: 'Deepavali (in lieu)' },
  { date: '2026-12-25', name: 'Christmas Day' },
  // 2027
  { date: '2027-01-01', name: "New Year's Day" },
  { date: '2027-02-06', name: 'Chinese New Year' },
  { date: '2027-02-07', name: 'Chinese New Year' },
  { date: '2027-02-08', name: 'Chinese New Year (in lieu)' },
  { date: '2027-03-10', name: 'Hari Raya Puasa' },
  { date: '2027-03-26', name: 'Good Friday' },
  { date: '2027-05-01', name: 'Labour Day' },
  { date: '2027-05-17', name: 'Hari Raya Haji' },
  { date: '2027-05-20', name: 'Vesak Day' },
  { date: '2027-08-09', name: 'National Day' },
  { date: '2027-10-28', name: 'Deepavali' },
  { date: '2027-12-25', name: 'Christmas Day' },
];

const HOLIDAYS_BY_DATE = new Map(SG_HOLIDAYS.map((h) => [h.date, h]));

export function sgHolidayOn(date: string): SgHoliday | undefined {
  return HOLIDAYS_BY_DATE.get(date);
}
