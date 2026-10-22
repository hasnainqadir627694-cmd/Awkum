import { AdminUser } from './adminData';

export interface ClassStudentItem {
  id: string;
  name: string;
  rollNumber: string;
  fatherName: string;
  email: string;
  class: string; // e.g. 'BSCS 3A'
  status: 'active' | 'suspended';
  avatarUrl?: string;
}

// Authentic student rosters for AWKUM Computer Science & Software Engineering classes
export const BASE_CLASS_ROSTERS: Record<string, ClassStudentItem[]> = {
  'BSCS 3A': [
    { id: 'st-3a-01', rollNumber: '23CS1001', name: 'Usman Ali Khan', fatherName: 'Sher Ali Khan', email: 'usman.ali@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-02', rollNumber: '23CS1002', name: 'Hamza Farooq', fatherName: 'Farooq Ahmad', email: 'hamza.farooq@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-03', rollNumber: '23CS1003', name: 'Ayesha Bibi', fatherName: 'Muhammad Tariq', email: 'ayesha.bibi@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-04', rollNumber: '23CS1004', name: 'Bilal Ahmad', fatherName: 'Gulzar Ahmad', email: 'bilal.ahmad@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-05', rollNumber: '23CS1005', name: 'Zeeshan Qureshi', fatherName: 'Abdul Qayyum', email: 'zeeshan.q@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-06', rollNumber: '23CS1006', name: 'Fatima Zahra', fatherName: 'Syed Zahir Shah', email: 'fatima.z@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-07', rollNumber: '23CS1007', name: 'Daniyal Afridi', fatherName: 'Imtiaz Afridi', email: 'daniyal.afridi@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-08', rollNumber: '23CS1008', name: 'Sana Rehman', fatherName: 'Abdul Rehman', email: 'sana.rehman@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-09', rollNumber: '23CS1009', name: 'Kashif Mehmood', fatherName: 'Sultan Mehmood', email: 'kashif.m@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-10', rollNumber: '23CS1010', name: 'Muhammad Shahzaib', fatherName: 'Muhammad Aslam', email: 'shahzaib.m@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-11', rollNumber: '23CS1011', name: 'Hira Gul', fatherName: 'Gul Muhammad', email: 'hira.gul@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-12', rollNumber: '23CS1012', name: 'Taimur Babar', fatherName: 'Babar Hayat', email: 'taimur.babar@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-13', rollNumber: '23CS1013', name: 'Zubair Yousaf', fatherName: 'Muhammad Yousaf', email: 'zubair.y@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-14', rollNumber: '23CS1014', name: 'Laiba Noor', fatherName: 'Noor ul Hassan', email: 'laiba.noor@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-15', rollNumber: '23CS1015', name: 'Asad Ullah', fatherName: 'Rahim Ullah', email: 'asad.ullah@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-16', rollNumber: '23CS1016', name: 'Noman Khalid', fatherName: 'Khalid Mehmood', email: 'noman.khalid@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-17', rollNumber: '23CS1017', name: 'Mariam Jan', fatherName: 'Jan Muhammad', email: 'mariam.jan@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-18', rollNumber: '23CS1018', name: 'Adnan Shah', fatherName: 'Syed Anwar Shah', email: 'adnan.shah@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-19', rollNumber: '23CS1019', name: 'Jawad Rauf', fatherName: 'Abdul Rauf', email: 'jawad.rauf@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
    { id: 'st-3a-20', rollNumber: '23CS1020', name: 'Iqra Mumtaz', fatherName: 'Mumtaz Ali', email: 'iqra.mumtaz@awkum.edu.pk', class: 'BSCS 3A', status: 'active' },
  ],
  'BSSE 1A': [
    { id: 'st-1a-01', rollNumber: '26SE1001', name: 'Farhan Zaheer', fatherName: 'Zaheer ud Din', email: 'farhan.z@awkum.edu.pk', class: 'BSSE 1A', status: 'active' },
    { id: 'st-1a-02', rollNumber: '26SE1002', name: 'Sohaib Akhtar', fatherName: 'Akhtar Munir', email: 'sohaib.akhtar@awkum.edu.pk', class: 'BSSE 1A', status: 'active' },
    { id: 'st-1a-03', rollNumber: '26SE1003', name: 'Mahnoor Khan', fatherName: 'Jamshed Khan', email: 'mahnoor.k@awkum.edu.pk', class: 'BSSE 1A', status: 'active' },
    { id: 'st-1a-04', rollNumber: '26SE1004', name: 'Waleed Raza', fatherName: 'Ghulam Raza', email: 'waleed.raza@awkum.edu.pk', class: 'BSSE 1A', status: 'active' },
    { id: 'st-1a-05', rollNumber: '26SE1005', name: 'Khadija Bibi', fatherName: 'Muhammad Sadiq', email: 'khadija.b@awkum.edu.pk', class: 'BSSE 1A', status: 'active' },
  ],
  'BSCS 2A': [
    { id: 'st-2a-01', rollNumber: '24CS2001', name: 'Shahid Khan', fatherName: 'Khan Bahadur', email: 'shahid.k@awkum.edu.pk', class: 'BSCS 2A', status: 'active' },
    { id: 'st-2a-02', rollNumber: '24CS2002', name: 'Rida Tahir', fatherName: 'Tahir Mehmood', email: 'rida.t@awkum.edu.pk', class: 'BSCS 2A', status: 'active' },
    { id: 'st-2a-03', rollNumber: '24CS2003', name: 'Mudasir Iqbal', fatherName: 'Iqbal Hussain', email: 'mudasir.i@awkum.edu.pk', class: 'BSCS 2A', status: 'active' },
    { id: 'st-2a-04', rollNumber: '24CS2004', name: 'Anum Zahoor', fatherName: 'Zahoor Ahmad', email: 'anum.z@awkum.edu.pk', class: 'BSCS 2A', status: 'active' },
  ],
};

/**
 * Returns the roster for an assigned class, merging dynamically registered students
 */
export function getEnrolledStudentsForClass(
  className: string,
  extraRegisteredUsers: AdminUser[] = []
): ClassStudentItem[] {
  const normalizedClass = className.trim();
  const baseStudents = BASE_CLASS_ROSTERS[normalizedClass] || [];

  // Merge any registered users whose assignedClass matches
  const additional = extraRegisteredUsers
    .filter(
      (u) =>
        u.assignedClass === normalizedClass &&
        !baseStudents.some((b) => b.email.toLowerCase() === u.email.toLowerCase())
    )
    .map((u) => ({
      id: u.id,
      name: u.name,
      rollNumber: u.studentId || u.id,
      fatherName: u.fatherName || 'Not Recorded',
      email: u.email,
      class: normalizedClass,
      status: u.status === 'suspended' ? ('suspended' as const) : ('active' as const),
    }));

  return [...additional, ...baseStudents];
}
