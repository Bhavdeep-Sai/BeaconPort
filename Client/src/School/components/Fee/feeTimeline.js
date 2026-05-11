// Local TERM_DEFS (mirrors Fee component)
const TERM_DEFS = {
  'half-yearly': [
    { key: 'H1', label: 'Term 1 (Jan – Jun)' },
    { key: 'H2', label: 'Term 2 (Jul – Dec)' },
  ],
  quarterly: [
    { key: 'Q1', label: 'Q1 (Jan – Mar)' },
    { key: 'Q2', label: 'Q2 (Apr – Jun)' },
    { key: 'Q3', label: 'Q3 (Jul – Sep)' },
    { key: 'Q4', label: 'Q4 (Oct – Dec)' },
  ],
  monthly: ['January','February','March','April','May','June',
            'July','August','September','October','November','December']
    .map(m => ({ key: m, label: m })),
  annual: [{ key: 'Annual', label: 'Full Year' }],
};

const MONTHS = TERM_DEFS.monthly.map(t => t.key);

const toDate = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };

const getMonthIndex = (monthKey) => MONTHS.indexOf(monthKey);

const getStudentId = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return String(value._id || value.id || '');
  return String(value);
};

const expandTermsForFrequency = (joinDate, freq, currentDate = new Date()) => {
  const rows = [];
  const start = toDate(joinDate) || new Date();
  const startYear = start.getFullYear();
  const endYear = currentDate.getFullYear();

  const termsForYear = (year) => {
    if (freq === 'monthly') return TERM_DEFS.monthly.map(t => t.key);
    if (freq === 'quarterly') return ['Q1','Q2','Q3','Q4'];
    if (freq === 'half-yearly') return ['H1','H2'];
    return ['Annual'];
  };

  for (let y = startYear; y <= endYear; y++) {
    const terms = termsForYear(y);
    for (const term of terms) {
      // skip terms before join month in start year
      if (y === startYear && freq === 'monthly') {
        const monthIdx = getMonthIndex(term);
        if (monthIdx < start.getMonth()) continue;
      }
      rows.push({ year: y, term });
    }
  }
  return rows;
};

const makeKey = (studentId, year, term) => `${studentId}::${year}::${term}`;

export const buildFeeTimelineRows = (students = [], fees = [], frequency = 'half-yearly', currentDate = new Date()) => {
  const feeMap = new Map();
  fees.forEach(f => {
    const studentId = getStudentId(f.student);
    if (!studentId) return;
    const key = makeKey(studentId, Number(f.year), String(f.term));
    feeMap.set(key, f);
  });

  const rows = [];
  students.forEach(s => {
    const join = toDate(s.createdAt) || new Date();
    const periods = expandTermsForFrequency(join, frequency, currentDate);
    periods.forEach(p => {
      const key = makeKey(String(s._id), p.year, p.term);
      const record = feeMap.get(key) || null;
      
      const totalFee = (() => {
        const cls = s.studentClass;
        const classFee = cls ? (cls.classFee || 0) : 0;
        const includedIds = new Set((cls?.includedSubjects || []).map(id => String(id)));
        const subjectFees = (s.enrolledSubjects || []).reduce((sum, sub) => {
          if (includedIds.has(String(sub._id))) return sum;
          return sum + (sub.subjectFee || 0);
        }, 0);
        return classFee + subjectFees;
      })();

      rows.push({
        student: s,
        class: s.studentClass || null,
        term: p.term,
        year: p.year,
        fee: record || null,
        totalFee,
      });
    });
  });

  return rows.sort((a,b) => b.year - a.year || (String(a.student.name || '').localeCompare(String(b.student.name || ''))));
};

export const summarizeFeeRows = (rows = []) => rows.reduce((acc, r) => {
  const status = r.fee?.status || 'no-record';
  acc[status] = (acc[status] || 0) + 1;
  acc.total = (acc.total || 0) + 1;
  if (r.fee) acc.totalAmt = (acc.totalAmt || 0) + (r.fee.amount || 0);
  return acc;
}, { total: 0 });
