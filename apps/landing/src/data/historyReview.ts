// A fictional marketing walkthrough. It holds no health data and writes nothing.
export const reviewSteps = [
  {
    label: 'No record ≠ a missed tablet',
    title: '“I remember Saturday, but not Friday.”',
    copy: 'Friday, October 9 has no record. Do you remember taking tablet 13 that day?',
    status: 'No record',
  },
  {
    label: 'A proposed change, for you to review',
    title: '“I took it after dinner.”',
    copy: 'Petal proposes marking tablet 13 as taken. The exact time remains unknown. You review the change before anything is saved.',
    status: 'No record → Taken · time unknown',
  },
  {
    label: 'Your confirmation comes first',
    title: 'A clearer record. Still your decision.',
    copy: 'In the app, confirming saves the change and keeps an audit trail. Canceling changes nothing. Any guidance is reevaluated from the confirmed record.',
    status: 'After confirmation: Taken · time unknown',
  },
] as const;

