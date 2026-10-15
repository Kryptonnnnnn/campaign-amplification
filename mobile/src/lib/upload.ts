import * as ImagePicker from 'expo-image-picker';
import { api } from './api';

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 3_500_000;

/** Opens the photo library, validates the file, uploads it, and returns the hosted URL (null if cancelled). */
export async function pickAndUpload(aspect: [number, number] = [16, 9]): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Photo access is turned off. Enable it in Settings to add images.');
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7, allowsEditing: true, aspect });
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  const mime = a.mimeType ?? 'image/jpeg';
  if (!OK_TYPES.includes(mime)) throw new Error('Only JPG, PNG or WebP images are supported.');
  if (!a.base64) throw new Error('Couldn’t read that image. Try another one.');
  if (a.base64.length * 0.75 > MAX_BYTES) throw new Error('That image is over 3.5 MB. Choose a smaller one.');
  if (a.width < 600) throw new Error('That image is too small (under 600px wide) and may look blurry in ads.');
  const { url } = await api<{ url: string }>('/uploads', { method: 'POST', body: { mime, data: a.base64 } });
  return url;
}

/** Demo-mode stand-ins for an image-generation tool. */
export const SAMPLE_IMAGES = ['sample-a', 'sample-b', 'sample-c', 'sample-d', 'sample-e', 'sample-f'].map((s) => `https://picsum.photos/seed/${s}/1200/800`);
