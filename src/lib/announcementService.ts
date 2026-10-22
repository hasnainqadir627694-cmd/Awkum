import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { NoticeItem } from '../data/portalData';
import { AnnouncementItem, INITIAL_ANNOUNCEMENTS } from '../data/adminData';
import { recordAuditLog } from './authService';

let inMemoryAnnouncements: AnnouncementItem[] = [...INITIAL_ANNOUNCEMENTS];

/**
 * Creates and broadcasts an official university announcement to Firestore.
 */
export async function createAnnouncement(
  title: string,
  message: string,
  targetAudience: 'all' | 'students' | 'teachers' | 'crs',
  postedBy = 'Master Admin'
): Promise<{ success: boolean; item: AnnouncementItem }> {
  const newItem: AnnouncementItem = {
    id: `anc-${Date.now()}`,
    title: title.trim(),
    message: message.trim(),
    targetAudience,
    postedBy,
    date: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  };

  inMemoryAnnouncements = [newItem, ...inMemoryAnnouncements];

  if (db) {
    try {
      await addDoc(collection(db, 'announcements'), {
        ...newItem,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.info('[Announcement Service] Firestore notice:', err);
    }
  }

  await recordAuditLog({
    action: 'Announcement Broadcasted',
    performedBy: postedBy,
    details: `Title: "${newItem.title}" | Target: ${targetAudience.toUpperCase()}`,
    category: 'academic',
    status: 'success',
  });

  return { success: true, item: newItem };
}

/**
 * Subscribes to announcements formatted for Student Portal notices.
 */
export function subscribeToStudentNotices(
  targetAudience: 'all' | 'students' = 'students',
  onUpdate: (notices: NoticeItem[]) => void
): () => void {
  const mapToNoticeItems = (items: AnnouncementItem[]): NoticeItem[] => {
    return items
      .filter((i) => i.targetAudience === 'all' || i.targetAudience === targetAudience)
      .map((i) => ({
        id: i.id,
        title: i.title,
        department: 'AWKUM Central Administration',
        date: i.date,
        urgent: false,
        content: i.message,
      }));
  };

  // Immediate in-memory notification
  onUpdate(mapToNoticeItems(inMemoryAnnouncements));

  if (!db) {
    return () => {};
  }

  try {
    const q = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remoteItems: AnnouncementItem[] = [];
        snapshot.forEach((docSnap) => {
          remoteItems.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        if (remoteItems.length > 0) {
          inMemoryAnnouncements = remoteItems;
          onUpdate(mapToNoticeItems(remoteItems));
        }
      },
      (error) => {
        console.info('[Announcement Service] Listener notice:', error.message);
        onUpdate(mapToNoticeItems(inMemoryAnnouncements));
      }
    );

    return unsubscribe;
  } catch (err) {
    console.info('[Announcement Service] Setup notice:', err);
    return () => {};
  }
}
