export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const MONTH_INDEX = new Map(MONTHS.map((month, index) => [month, index]));

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toInputDate = (value) => {
  const date = toDate(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMonthIndex = (month) => {
  if (typeof month === 'number' && Number.isFinite(month)) return month;
  if (!month) return -1;
  if (MONTH_INDEX.has(month)) return MONTH_INDEX.get(month);

  const parsed = new Date(`${month} 1, 2000`);
  return Number.isNaN(parsed.getTime()) ? -1 : parsed.getMonth();
};

const teacherIdOf = (teacher) => (teacher && typeof teacher === 'object' ? teacher._id : teacher);

const getJoinDate = (teacher) => toDate(teacher?.createdAt) || new Date();

const getDueDateForPeriod = (joinDate, year, monthIndex) => {
  const dayOfMonth = joinDate.getDate();
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(dayOfMonth, lastDayOfMonth));
};

const isPastDue = (dueDate, currentDate) => {
  const due = toDate(dueDate);
  if (!due) return false;

  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return dueDay < today;
};

const getEffectiveStatus = ({ record, year, monthIndex, currentDate }) => {
  if (record?.status === 'paid' || record?.paidDate) return 'paid';
  if (record?.status === 'overdue') return 'overdue';

  // Mark overdue only when the period (year, month) is strictly before
  // the current year/month. This prevents marking the current month as
  // overdue just because its due day has already passed.
  const today = toDate(currentDate) || new Date();
  const curY = today.getFullYear();
  const curM = today.getMonth();

  if (year < curY) return 'overdue';
  if (year === curY && monthIndex < curM) return 'overdue';
  return 'pending';
};

const makeSalaryKey = (teacherId, year, monthIndex) => `${teacherId}::${year}::${monthIndex}`;

export const buildSalaryTimelineRows = (teachers = [], salaries = [], currentDate = new Date()) => {
  const today = toDate(currentDate) || new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const salaryMap = new Map();
  salaries.forEach((salary) => {
    const teacherId = teacherIdOf(salary.teacher);
    const monthIndex = getMonthIndex(salary.month);
    const year = Number(salary.year);

    if (!teacherId || monthIndex < 0 || !Number.isFinite(year)) return;
    salaryMap.set(makeSalaryKey(teacherId, year, monthIndex), salary);
  });

  const rows = [];

  teachers.forEach((teacher) => {
    const teacherId = teacher?._id;
    if (!teacherId) return;

    const joinDate = getJoinDate(teacher);
    const startYear = joinDate.getFullYear();
    const startMonth = joinDate.getMonth();

    for (let year = startYear; year <= currentYear; year += 1) {
      const firstMonth = year === startYear ? startMonth : 0;
      const lastMonth = year === currentYear ? currentMonth : 11;

      for (let monthIndex = firstMonth; monthIndex <= lastMonth; monthIndex += 1) {
        const record = salaryMap.get(makeSalaryKey(teacherId, year, monthIndex));
        const expectedDueDate = getDueDateForPeriod(joinDate, year, monthIndex);

        rows.push({
          _id: record?._id || null,
          _virtual: !record,
          teacher,
          amount: record?.amount != null ? record.amount : Number(teacher.salary) || 0,
          month: MONTHS[monthIndex],
          year,
          dueDate: toInputDate(record?.dueDate || expectedDueDate),
          paidDate: record?.paidDate ? toInputDate(record.paidDate) : null,
          status: getEffectiveStatus({ record, year, monthIndex, currentDate: today }),
          paymentMethod: record?.paymentMethod || null,
          description: record?.description || '',
        });
      }
    }
  });

  rows.sort((left, right) => {
    if (right.year !== left.year) return right.year - left.year;
    const monthDiff = getMonthIndex(right.month) - getMonthIndex(left.month);
    if (monthDiff !== 0) return monthDiff;
    return String(left.teacher?.name || '').localeCompare(String(right.teacher?.name || ''));
  });

  return rows;
};

export const summarizeSalaryTimelineRows = (rows = []) => rows.reduce((accumulator, row) => {
  const amount = Number(row.amount) || 0;
  const status = row.status || 'pending';

  accumulator.totalRecords += 1;
  accumulator[status] += amount;
  accumulator[`${status}Count`] += 1;
  return accumulator;
}, {
  paid: 0,
  pending: 0,
  overdue: 0,
  totalRecords: 0,
  paidCount: 0,
  pendingCount: 0,
  overdueCount: 0,
});